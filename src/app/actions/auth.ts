"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, destroySession } from "@/lib/session";
import { SPECIALTIES, STATES } from "@/lib/taxonomy";
import { LIMITS, hit, hitIp, resetLimit, waitMessage } from "@/lib/rate-limit";
import { sendPasswordChanged, sendPasswordReset } from "@/lib/notify";
import { createLinkToken, hashToken } from "@/lib/tokens";

const { users: U, passwordResetTokens: T } = schema;

let dummyHash: string | null = null;

export type FormState = { error?: string; ok?: boolean; fields?: Record<string, string> } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const password = z.string().min(10, "Use a password of at least 10 characters.").max(200, "Use a password under 200 characters.");

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password,
  practiceName: z.string().trim().min(2, "Enter the practice name."),
  specialty: z.enum(SPECIALTIES, { errorMap: () => ({ message: "Choose a specialty." }) }),
  state: z.string().refine((s) => STATES.includes(s), "Choose the practice state."),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const keep = { ...raw, password: "" };
  const limit = await hitIp("signup", LIMITS.signupIp);
  if (!limit.ok) return { error: waitMessage(limit), fields: keep };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: keep };
  const d = parsed.data;
  const existing = await db.select({ id: U.id }).from(U).where(eq(U.email, d.email)).limit(1);
  if (existing.length) return { error: "An account with that email already exists. Sign in instead.", fields: keep };
  const [u] = await db.insert(U).values({
    name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12),
    practiceName: d.practiceName, specialty: d.specialty, state: d.state, role: "PROVIDER",
    lastLoginAt: new Date(),
  }).returning({ id: U.id, v: U.sessionVersion });
  await createSession(u.id, u.v);
  redirect("/account?welcome=1");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const pw = String(form.get("password") ?? "");
  const emailKey = `login:email:${email}`;
  const [byIp, byEmail] = await Promise.all([hitIp("login", LIMITS.loginIp), hit(emailKey, LIMITS.loginEmail)]);
  if (!byIp.ok || !byEmail.ok) return { error: waitMessage(byIp.ok ? byEmail : byIp), fields: { email } };

  const [u] = await db.select().from(U).where(eq(U.email, email)).limit(1);
  // Compare against a dummy hash when the user doesn't exist, so timing doesn't reveal accounts.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(pw, u?.passwordHash ?? dummyHash);
  if (!u || !ok) return { error: "That email and password don't match.", fields: { email } };
  if (u.disabledAt) return { error: "This account has been turned off. Ask your BillerBench admin to turn it back on.", fields: { email } };
  await resetLimit(emailKey);
  await db.update(U).set({ lastLoginAt: new Date() }).where(eq(U.id, u.id));
  await createSession(u.id, u.sessionVersion);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/** Always answers the same way, so the form can't be used to find out who has an account. */
export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address.", fields: { email } };
  const byIp = await hitIp("reset", LIMITS.resetIp);
  if (!byIp.ok) return { error: waitMessage(byIp), fields: { email } };
  const byEmail = await hit(`reset:email:${email}`, LIMITS.resetEmail);

  const [u] = await db.select().from(U).where(eq(U.email, email)).limit(1);
  if (u && byEmail.ok && !u.disabledAt) {
    const token = await createLinkToken(u.id, "reset", 1);
    after(() => sendPasswordReset(u.email, u.name, token));
  }
  return { ok: true, fields: { email } };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const pw = password.safeParse(String(form.get("password") ?? ""));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "The two passwords don't match." };
  const limit = await hitIp("reset-submit", LIMITS.loginIp);
  if (!limit.ok) return { error: waitMessage(limit) };

  const now = new Date();
  let purpose = "reset";
  const user = await db.transaction(async (tx) => {
    // Claim the token atomically so it can only be used once.
    const [t] = await tx.update(T).set({ usedAt: now })
      .where(and(eq(T.tokenHash, hashToken(token)), isNull(T.usedAt), gt(T.expiresAt, now)))
      .returning({ userId: T.userId, purpose: T.purpose });
    if (!t) return null;
    const [u] = await tx.update(U).set({
      passwordHash: await bcrypt.hash(pw.data, 12),
      sessionVersion: sql`${U.sessionVersion} + 1`,
      lastLoginAt: now,
    }).where(and(eq(U.id, t.userId), isNull(U.disabledAt))).returning();
    if (!u) return null;
    purpose = t.purpose;
    // Any other outstanding links for this account stop working too.
    await tx.update(T).set({ usedAt: now }).where(and(eq(T.userId, t.userId), isNull(T.usedAt)));
    return u;
  });
  if (!user) return { error: "This reset link has expired or was already used. Request a new one." };
  await resetLimit(`login:email:${user.email}`);
  await createSession(user.id, user.sessionVersion);
  if (purpose === "invite") redirect("/team");
  after(() => sendPasswordChanged(user.email, user.name));
  redirect("/account?password=changed");
}
