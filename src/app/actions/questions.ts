"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff, requireUser } from "@/lib/auth";
import { scanPHI } from "@/lib/phi";
import { classifyCode, parseCodes } from "@/lib/codes";
import { EHR_SYSTEMS, MODIFIERS, SPECIALTIES, STATES, isValidPayer } from "@/lib/taxonomy";
import { PLANS, URGENT } from "@/lib/plans";
import { addBusinessHours } from "@/lib/sla";
import { slugify } from "@/lib/slug";
import { questionPath } from "@/lib/paths";
import { planQuestionsUsed } from "@/lib/queries";
import { appUrl, fakePayments, stripe } from "@/lib/stripe";
import { finalizeUrgentPayment } from "@/lib/payments";
import { LIMITS, hit, waitMessage } from "@/lib/rate-limit";
import { notifyStaffOfQuestion } from "@/lib/notify";

const { questions: Q, answers: A, votes: V, flags: F } = schema;

export type AskState = { errors?: string[] } | undefined;

const askSchema = z.object({
  tier: z.enum(["FREE", "PLAN", "URGENT"]),
  publish: z.boolean(),
  title: z.string().trim().min(15, "Write a title of at least 15 characters.").max(200, "Keep the title under 200 characters."),
  body: z.string().trim().min(30, "Describe the scenario in at least 30 characters.").max(10000),
  codes: z.string(),
  modifiers: z.array(z.enum(MODIFIERS)),
  payerGroup: z.string(),
  payerName: z.string(),
  state: z.string(),
  specialty: z.string(),
  ehr: z.string(),
  ack: z.boolean(),
});

export async function createQuestion(_: AskState, form: FormData): Promise<AskState> {
  const user = await requireUser("/ask");
  if (isStaff(user)) return { errors: ["Team accounts can't ask questions. Sign in as a provider."] };
  const limit = await hit(`ask:user:${user.id}`, LIMITS.askUser);
  if (!limit.ok) return { errors: [waitMessage(limit)] };
  const parsed = askSchema.safeParse({
    tier: form.get("tier"), publish: form.get("publish") === "on",
    title: form.get("title") ?? "", body: form.get("body") ?? "", codes: form.get("codes") ?? "",
    modifiers: form.getAll("modifiers"), payerGroup: form.get("payerGroup") ?? "", payerName: form.get("payerName") ?? "",
    state: form.get("state") ?? "", specialty: form.get("specialty") ?? "", ehr: form.get("ehr") ?? "", ack: form.get("ack") === "on",
  });
  if (!parsed.success) return { errors: parsed.error.issues.map((i) => i.message) };
  const d = parsed.data;
  const errors: string[] = [];
  const codes = parseCodes(d.codes).slice(0, 12);
  if (!codes.length && !d.modifiers.length) errors.push("Tag at least one code or modifier.");
  const bad = codes.filter((c) => !classifyCode(c));
  if (bad.length) errors.push(`Not a recognized CPT, HCPCS or ICD-10 code: ${bad.join(", ")}.`);
  if (!isValidPayer(d.payerGroup, d.payerName)) errors.push("Choose the payer.");
  if (!STATES.includes(d.state)) errors.push("Choose the practice state.");
  if (!(SPECIALTIES as readonly string[]).includes(d.specialty)) errors.push("Choose a specialty.");
  if (d.ehr && !(EHR_SYSTEMS as readonly string[]).includes(d.ehr)) errors.push("Choose a listed EHR, or none.");

  const plan = PLANS[user.plan];
  if (d.tier === "PLAN") {
    if (user.plan === "FREE") errors.push("Your account doesn't have a plan. Choose Free or Urgent.");
    else if ((await planQuestionsUsed(user.id)) >= plan.quota) errors.push(`You've used all ${plan.quota} plan questions this month. Choose Free or Urgent.`);
  }
  const isPublic = d.tier === "FREE" || d.publish;
  if (scanPHI(`${d.title}\n${d.body}`).length) errors.push("Remove the possible patient identifiers flagged above. BillerBench never stores patient information.");
  if (!d.ack) errors.push("Confirm the scenario contains no patient-identifiable data.");
  if (errors.length) return { errors };

  const now = new Date();
  const slaHours = d.tier === "URGENT" ? URGENT.slaBusinessHours : d.tier === "PLAN" ? plan.slaBusinessHours : PLANS.FREE.slaBusinessHours;
  const slug = `${slugify(d.title, 70)}-${randomBytes(3).toString("hex")}`;
  const [q] = await db.insert(Q).values({
    slug, title: d.title, body: d.body, authorId: user.id, codes, modifiers: d.modifiers,
    payerGroup: d.payerGroup, payerName: d.payerName, state: d.state, specialty: d.specialty, ehr: d.ehr || null,
    tier: d.tier, isPrivate: !isPublic, status: d.tier === "URGENT" ? "PENDING_PAYMENT" : "OPEN",
    dueAt: d.tier === "URGENT" ? null : addBusinessHours(now, slaHours),
  }).returning();

  if (d.tier === "URGENT") {
    const url = await urgentCheckoutUrl(q.id, user, "Urgent question: answer within 4 business hours");
    redirect(url);
  }
  after(() => notifyStaffOfQuestion(q, "new"));
  revalidatePath("/");
  redirect(questionPath(q));
}

async function urgentCheckoutUrl(questionId: string, user: { id: string; email: string; stripeCustomerId: string | null }, label: string) {
  const [q] = await db.select().from(Q).where(eq(Q.id, questionId));
  if (fakePayments()) {
    await finalizeUrgentPayment(questionId, null);
    return questionPath(q) + "?paid=1";
  }
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: URGENT.priceCents, product_data: { name: label } } }],
    metadata: { kind: "urgent", questionId, userId: user.id },
    success_url: `${appUrl()}/checkout/done?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}${questionPath(q)}?payment=cancelled`,
  });
  return session.url!;
}

/** Pays to move a free question to the 4-hour urgent queue. */
export async function upgradeQuestion(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("questionId"));
  const [q] = await db.select().from(Q).where(and(eq(Q.id, id), eq(Q.authorId, user.id)));
  if (!q || q.tier !== "FREE" || q.status !== "OPEN") redirect("/");
  redirect(await urgentCheckoutUrl(q.id, user, "Upgrade to urgent: answer within 4 business hours"));
}

/** Resumes payment for an urgent question whose checkout was abandoned. */
export async function resumePayment(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("questionId"));
  const [q] = await db.select().from(Q).where(and(eq(Q.id, id), eq(Q.authorId, user.id), eq(Q.status, "PENDING_PAYMENT")));
  if (!q) redirect("/");
  redirect(await urgentCheckoutUrl(q.id, user, "Urgent question: answer within 4 business hours"));
}

export async function toggleVote(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const questionId = (form.get("questionId") as string) || null;
  const answerId = (form.get("answerId") as string) || null;
  const path = String(form.get("path") ?? "/");
  if (!!questionId === !!answerId) return;
  if (!(await hit(`vote:user:${user.id}`, LIMITS.voteUser)).ok) return;
  await db.transaction(async (tx) => {
    const target = questionId ? Q : A;
    const targetId = (questionId ?? answerId)!;
    const [row] = await tx.select({ authorId: target.authorId }).from(target).where(eq(target.id, targetId));
    if (!row || row.authorId === user.id) return;
    const match = questionId ? and(eq(V.userId, user.id), eq(V.questionId, questionId)) : and(eq(V.userId, user.id), eq(V.answerId, answerId!));
    const deleted = await tx.delete(V).where(match).returning({ id: V.id });
    if (!deleted.length) await tx.insert(V).values({ userId: user.id, questionId, answerId });
    await tx.update(target).set({ voteCount: sql`${target.voteCount} + ${deleted.length ? -1 : 1}` }).where(eq(target.id, targetId));
  });
  revalidatePath(path);
}

export async function acceptAnswer(form: FormData) {
  const user = await requireUser();
  const questionId = String(form.get("questionId"));
  const answerId = String(form.get("answerId"));
  const path = String(form.get("path") ?? "/");
  const [q] = await db.select().from(Q).where(and(eq(Q.id, questionId), eq(Q.authorId, user.id)));
  if (!q) return;
  const [a] = await db.select().from(A).where(and(eq(A.id, answerId), eq(A.questionId, q.id), eq(A.type, "EXPERT")));
  if (!a) return;
  const unaccept = q.acceptedAnswerId === a.id;
  await db.update(Q).set({ acceptedAnswerId: unaccept ? null : a.id, status: unaccept ? "ANSWERED" : "SOLVED" }).where(eq(Q.id, q.id));
  revalidatePath(path);
}

/** Anyone signed in can report PHI; the post is hidden immediately until staff review it. */
export async function reportPhi(form: FormData) {
  const user = await requireUser();
  const questionId = (form.get("questionId") as string) || null;
  const answerId = (form.get("answerId") as string) || null;
  const path = String(form.get("path") ?? "/");
  if (!!questionId === !!answerId) return;
  if (!(await hit(`report:user:${user.id}`, LIMITS.reportUser)).ok) return;
  await db.transaction(async (tx) => {
    await tx.insert(F).values({ reporterId: user.id, questionId, answerId });
    if (questionId) await tx.update(Q).set({ hidden: true }).where(eq(Q.id, questionId));
    else await tx.update(A).set({ hidden: true }).where(eq(A.id, answerId!));
  });
  revalidatePath(path);
  revalidatePath("/team");
}
