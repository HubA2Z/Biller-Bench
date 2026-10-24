"use server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { isAudienceRole } from "@/lib/audience";
import { LIMITS, hitIp } from "@/lib/rate-limit";

const AR = schema.audienceResponses;

/** Saves an anonymous "Who's reading?" answer and returns its id. Nothing identifying is stored. */
export async function recordAudience(role: string, path: string): Promise<string | null> {
  if (!isAudienceRole(role)) return null;
  const limit = await hitIp("audience", LIMITS.audienceIp);
  if (!limit.ok) return null;
  const clean = path.startsWith("/") ? path.split(/[?#]/)[0].slice(0, 200) : null;
  const [row] = await db.insert(AR).values({ role, path: clean }).returning({ id: AR.id });
  return row.id;
}

/** Saves the answer to the follow-up "Need billing help?" question (once per response). */
export async function recordHelpAnswer(id: string, wantsHelp: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await db.update(AR).set({ wantsHelp }).where(and(eq(AR.id, id), isNull(AR.wantsHelp)));
}
