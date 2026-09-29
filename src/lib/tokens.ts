import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db, schema } from "@/db";

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Creates a single-use link token. Only its hash is stored; the raw token goes in the email. */
export async function createLinkToken(userId: string, purpose: "reset" | "invite", hours: number) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.passwordResetTokens).values({
    userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + hours * 3600_000),
  });
  return token;
}
