"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { classifyCode, parseCodes } from "@/lib/codes";
import { questionPath } from "@/lib/paths";
import { scanPHI } from "@/lib/phi";
import { slugify } from "@/lib/slug";
import { SPECIALTIES, STATES, isValidPayer } from "@/lib/taxonomy";
import { systemAuthorId } from "@/lib/qa";
import { after } from "next/server";
import { notifyInquiryAnswered } from "@/lib/notify";

const Q = schema.questions, A = schema.answers, I = schema.inquiries;
export type QAState = { errors?: string[] } | undefined;

const qaSchema = z.object({
  id: z.string().optional(),
  inquiryId: z.string().optional(),
  source: z.enum(["provider", "biller", "reader", "team"]),
  title: z.string().trim().min(8, "Write a question title (at least 8 characters).").max(200),
  // Short questions are fine: if the details box is empty, the title is the question.
  body: z.string().trim().max(10000),
  answer: z.string().trim().min(20, "Write an answer of at least 20 characters.").max(20000),
  codes: z.string(),
  payerGroup: z.string(), payerName: z.string(), state: z.string(), specialty: z.string(),
  anonymized: z.literal("on", { errorMap: () => ({ message: "Confirm the question has no names, practice details or patient information." }) }),
  intent: z.enum(["draft", "publish"]),
});

/** Create or update a reader/team Q&A with its expert answer. */
export async function saveQA(_: QAState, form: FormData): Promise<QAState> {
  const me = await requireStaff();
  const parsed = qaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.issues.map((i) => i.message) };
  const d = parsed.data;
  const errors: string[] = [];
  const codes = parseCodes(d.codes).slice(0, 12);
  const bad = codes.filter((c) => !classifyCode(c));
  if (bad.length) errors.push(`Not a recognized CPT, HCPCS or ICD-10 code: ${bad.join(", ")}.`);
  if (!codes.length) errors.push("Tag at least one CPT, HCPCS or ICD-10 code.");
  if (!isValidPayer(d.payerGroup, d.payerName)) errors.push("Choose the payer.");
  if (d.state !== "US" && !STATES.includes(d.state)) errors.push("Choose a state, or All states.");
  if (!(SPECIALTIES as readonly string[]).includes(d.specialty)) errors.push("Choose a specialty.");
  if (scanPHI(`${d.title}\n${d.body}\n${d.answer}`).length) errors.push("Remove the possible patient identifiers. BillerBench never stores patient information.");
  if (errors.length) return { errors };

  const publish = d.intent === "publish";
  const now = new Date();
  const fields = {
    title: d.title, body: d.body || d.title, codes, payerGroup: d.payerGroup, payerName: d.payerName, state: d.state, specialty: d.specialty,
    source: d.source, draft: !publish, isPrivate: false, status: "ANSWERED" as const, tier: "FREE" as const, dueAt: null,
  };
  const id = await db.transaction(async (tx) => {
    if (d.id) {
      const [q] = await tx.update(Q).set(fields).where(eq(Q.id, d.id)).returning();
      const [first] = await tx.select().from(A).where(and(eq(A.questionId, q.id), eq(A.type, "EXPERT"), eq(A.removed, false))).orderBy(asc(A.createdAt)).limit(1);
      if (first) await tx.update(A).set({ body: d.answer }).where(eq(A.id, first.id));
      else await tx.insert(A).values({ questionId: q.id, authorId: me.id, type: "EXPERT", body: d.answer });
      return q.id;
    }
    const [q] = await tx.insert(Q).values({
      ...fields, slug: `${slugify(d.title, 70)}-${randomBytes(3).toString("hex")}`, authorId: await systemAuthorId(), firstAnsweredAt: now,
    }).returning();
    await tx.insert(A).values({ questionId: q.id, authorId: me.id, type: "EXPERT", body: d.answer });
    if (d.inquiryId) await tx.update(I).set({ questionId: q.id, status: "REVIEWED" }).where(eq(I.id, d.inquiryId));
    return q.id;
  });
  revalidatePath("/"); revalidatePath("/questions"); revalidatePath("/team");
  const [q] = await db.select().from(Q).where(eq(Q.id, id));
  if (publish) {
    // Tell the person who sent the question (once), with a link to the answer.
    const [inq] = await db.select().from(I).where(eq(I.questionId, q.id));
    if (inq && !inq.answerNotifiedAt) {
      await db.update(I).set({ answerNotifiedAt: new Date() }).where(eq(I.id, inq.id));
      after(() => notifyInquiryAnswered(inq, q));
    }
  }
  redirect(publish ? questionPath(q) : "/team#qa-drafts");
}

/** Publish or delete a Q&A draft from the team queue. */
export async function setQAStatus(form: FormData) {
  await requireStaff();
  const id = String(form.get("id"));
  const action = String(form.get("action"));
  if (action === "publish") {
    const [q] = await db.update(Q).set({ draft: false }).where(eq(Q.id, id)).returning();
    const [inq] = q ? await db.select().from(I).where(eq(I.questionId, q.id)) : [];
    if (q && inq && !inq.answerNotifiedAt) {
      await db.update(I).set({ answerNotifiedAt: new Date() }).where(eq(I.id, inq.id));
      after(() => notifyInquiryAnswered(inq, q));
    }
  }
  if (action === "delete") await db.update(Q).set({ removed: true }).where(eq(Q.id, id));
  revalidatePath("/"); revalidatePath("/questions"); revalidatePath("/team");
}
