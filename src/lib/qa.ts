import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const SYSTEM_EMAIL = "questions@billerbench.system";

/**
 * A non-login account that owns reader and team questions, so no real person
 * is shown as the asker. It's switched off, so nobody can sign in with it.
 */
export async function systemAuthorId(): Promise<string> {
  const U = schema.users;
  const [found] = await db.select({ id: U.id }).from(U).where(eq(U.email, SYSTEM_EMAIL));
  if (found) return found.id;
  const [created] = await db.insert(U).values({
    email: SYSTEM_EMAIL, name: "BillerBench", role: "PROVIDER", emailNotifications: false,
    passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10), disabledAt: new Date(),
  }).onConflictDoNothing().returning({ id: U.id });
  if (created) return created.id;
  const [again] = await db.select({ id: U.id }).from(U).where(eq(U.email, SYSTEM_EMAIL));
  return again.id;
}
