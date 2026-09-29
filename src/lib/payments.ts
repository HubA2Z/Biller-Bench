import "server-only";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import type Stripe from "stripe";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { addBusinessHours } from "./sla";
import { PLANS, URGENT } from "./plans";
import { notifyStaffOfQuestion } from "./notify";

const { questions: Q, users: U } = schema;

/**
 * Marks an urgent question (new or upgraded) as paid and starts its
 * 4-business-hour clock. Safe to call more than once for the same payment.
 */
export async function finalizeUrgentPayment(questionId: string, sessionId: string | null) {
  const now = new Date();
  const [paid] = await db.update(Q).set({
    tier: "URGENT",
    paidAt: now,
    stripeSessionId: sessionId,
    dueAt: addBusinessHours(now, URGENT.slaBusinessHours),
    status: "OPEN",
  }).where(and(eq(Q.id, questionId), isNull(Q.paidAt))).returning();
  // An upgraded question may already have an expert answer; keep its status.
  await db.update(Q).set({ status: "ANSWERED" })
    .where(and(eq(Q.id, questionId), eq(Q.status, "OPEN"), isNotNull(Q.firstAnsweredAt)));
  // Only the first confirmation of a payment alerts the team.
  if (paid) await notifyStaffOfQuestion(paid, "new");
}

export function planFromPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  for (const p of Object.values(PLANS)) {
    if (p.stripePriceEnv && process.env[p.stripePriceEnv] === priceId) return p.key;
  }
  return null;
}

export async function setPlan(userId: string, plan: Plan, extra: Partial<typeof U.$inferInsert> = {}) {
  await db.update(U).set({ plan, ...extra }).where(eq(U.id, userId));
}

/** Applies a Stripe subscription's state to the matching user. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const active = ["active", "trialing", "past_due"].includes(sub.status);
  const item = sub.items.data[0];
  const plan = active ? planFromPriceId(item?.price.id) : null;
  const periodEnd = (item as unknown as { current_period_end?: number })?.current_period_end;
  await db.update(U).set({
    plan: plan ?? "FREE",
    stripeSubscriptionId: active ? sub.id : null,
    planRenewsAt: active && periodEnd ? new Date(periodEnd * 1000) : null,
  }).where(eq(U.stripeCustomerId, customerId));
}
