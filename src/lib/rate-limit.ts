import "server-only";
import { headers } from "next/headers";
import { sql, lt } from "drizzle-orm";
import { db, schema } from "@/db";

export type Limit = { limit: number; windowSec: number };

/** Limits used across the app. Tune here. */
export const LIMITS = {
  loginIp: { limit: 20, windowSec: 15 * 60 },
  loginEmail: { limit: 8, windowSec: 15 * 60 },
  signupIp: { limit: 5, windowSec: 60 * 60 },
  resetIp: { limit: 5, windowSec: 60 * 60 },
  resetEmail: { limit: 3, windowSec: 60 * 60 },
  askUser: { limit: 10, windowSec: 60 * 60 },
  replyUser: { limit: 30, windowSec: 60 * 60 },
  reportUser: { limit: 20, windowSec: 60 * 60 },
  voteUser: { limit: 120, windowSec: 60 * 60 },
  leadIp: { limit: 5, windowSec: 60 * 60 },
  npiUser: { limit: 10, windowSec: 60 * 60 },
  similarIp: { limit: 60, windowSec: 60 },
} satisfies Record<string, Limit>;

export type LimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

/**
 * Counts one hit against `key` in a fixed window, atomically in Postgres, so
 * it works across multiple app servers without Redis.
 */
export async function hit(key: string, { limit, windowSec }: Limit): Promise<LimitResult> {
  const R = schema.rateLimits;
  const rows = await db.execute<{ count: number; reset_at: Date }>(sql`
    insert into ${R} (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSec}))
    on conflict (key) do update set
      count = case when ${R.resetAt} <= now() then 1 else ${R.count} + 1 end,
      reset_at = case when ${R.resetAt} <= now() then excluded.reset_at else ${R.resetAt} end
    returning count, reset_at`);
  const row = rows.rows[0];
  // Clear out expired counters now and then.
  if (Math.random() < 0.01) await db.delete(R).where(lt(R.resetAt, sql`now() - interval '1 day'`));
  const resetAt = new Date(row.reset_at);
  return {
    ok: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterSec: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
  };
}

/** Clears a counter, for example after a successful login. */
export async function resetLimit(key: string) {
  await db.delete(schema.rateLimits).where(sql`${schema.rateLimits.key} = ${key}`);
}

/**
 * The visitor's IP. Uses the first X-Forwarded-For address, which is right
 * behind a trusted proxy (Vercel, Render, a load balancer). If the app is
 * exposed directly, set TRUST_PROXY=false.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  if (process.env.TRUST_PROXY !== "false") {
    const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
    const real = h.get("x-real-ip");
    if (real) return real;
  }
  return null;
}

/**
 * Per-IP limit. When the IP can't be determined, skip it rather than lumping
 * every visitor into one shared bucket (per-account limits still apply).
 */
export async function hitIp(prefix: string, l: Limit): Promise<LimitResult> {
  const ip = await clientIp();
  if (!ip) return { ok: true, remaining: l.limit, retryAfterSec: 0 };
  return hit(`${prefix}:ip:${ip}`, l);
}

export function waitMessage(r: LimitResult) {
  const m = Math.ceil(r.retryAfterSec / 60);
  return `Too many attempts. Try again in ${m <= 1 ? "a minute" : `${m} minutes`}.`;
}
