"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isValidNpi, lookupNpi, npiMatchesAccount } from "@/lib/npi";
import { LIMITS, hit, waitMessage } from "@/lib/rate-limit";

export type NpiState = { error?: string; message?: string; verified?: boolean } | undefined;

export async function verifyNpi(_: NpiState, form: FormData): Promise<NpiState> {
  const user = await requireUser("/account");
  const limit = await hit(`npi:user:${user.id}`, LIMITS.npiUser);
  if (!limit.ok) return { error: waitMessage(limit) };
  const npi = String(form.get("npi") ?? "").replace(/\D/g, "");
  if (!isValidNpi(npi)) return { error: npi.length === 10 ? "That NPI fails the check-digit test. Check for a typo." : "An NPI is exactly 10 digits." };
  let rec;
  try {
    rec = await lookupNpi(npi);
  } catch {
    return { error: "The NPI Registry didn't respond. Try again in a few minutes." };
  }
  if (!rec) {
    await db.update(schema.users).set({ npi, npiVerifiedAt: null, npiNote: "Not found in NPPES" }).where(eq(schema.users.id, user.id));
    return { error: "That NPI isn't in the NPI Registry." };
  }
  const match = npiMatchesAccount(rec, user.name, user.practiceName);
  await db.update(schema.users).set({
    npi,
    npiVerifiedAt: match ? new Date() : null,
    npiNote: `${rec.type} · ${rec.name}${rec.taxonomy ? ` · ${rec.taxonomy}` : ""}${rec.state ? ` · ${rec.state}` : ""}`,
  }).where(eq(schema.users.id, user.id));
  revalidatePath("/account");
  return match
    ? { verified: true, message: `Verified: ${rec.name}${rec.taxonomy ? `, ${rec.taxonomy}` : ""}.` }
    : { message: `Found ${rec.name}, which doesn't match the name on your account. Our team will review it within one business day.` };
}

export async function setEmailNotifications(form: FormData) {
  const user = await requireUser("/account");
  await db.update(schema.users).set({ emailNotifications: form.get("on") === "true" }).where(eq(schema.users.id, user.id));
  revalidatePath("/account");
}
