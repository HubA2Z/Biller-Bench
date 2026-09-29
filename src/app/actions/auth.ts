"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, destroySession } from "@/lib/session";
import { SPECIALTIES, STATES } from "@/lib/taxonomy";

let dummyHash: string | null = null;

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(10, "Use a password of at least 10 characters."),
  practiceName: z.string().trim().min(2, "Enter the practice name."),
  specialty: z.enum(SPECIALTIES, { errorMap: () => ({ message: "Choose a specialty." }) }),
  state: z.string().refine((s) => STATES.includes(s), "Choose the practice state."),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { ...raw, password: "" } };
  const d = parsed.data;
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, d.email)).limit(1);
  if (existing.length) return { error: "An account with that email already exists. Sign in instead.", fields: { ...raw, password: "" } };
  const [u] = await db.insert(schema.users).values({
    name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 12),
    practiceName: d.practiceName, specialty: d.specialty, state: d.state, role: "PROVIDER",
  }).returning({ id: schema.users.id });
  await createSession(u.id);
  redirect("/account?welcome=1");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  // Compare against a dummy hash when the user doesn't exist, so timing doesn't reveal accounts.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(password, u?.passwordHash ?? dummyHash);
  if (!u || !ok) return { error: "That email and password don't match.", fields: { email } };
  await createSession(u.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
