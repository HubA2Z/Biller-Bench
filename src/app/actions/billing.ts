"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Plan } from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { appUrl, fakePayments, stripe } from "@/lib/stripe";
import { setPlan } from "@/lib/payments";

async function ensureCustomer(user: { id: string; email: string; name: string; practiceName: string | null; stripeCustomerId: string | null }) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const c = await stripe().customers.create({ email: user.email, name: user.practiceName ?? user.name, metadata: { userId: user.id } });
  await db.update(schema.users).set({ stripeCustomerId: c.id }).where(eq(schema.users.id, user.id));
  return c.id;
}

export async function startPlanCheckout(form: FormData) {
  const user = await requireUser("/pricing");
  if (isStaff(user)) redirect("/pricing");
  const plan = String(form.get("plan")) as Plan;
  const info = PLANS[plan];
  if (!info || plan === "FREE") redirect("/pricing");

  if (fakePayments()) {
    await setPlan(user.id, plan, { planRenewsAt: new Date(Date.now() + 30 * 86400_000) });
    redirect("/account?plan=updated");
  }
  // Existing subscribers change plans in the Stripe billing portal.
  if (user.stripeSubscriptionId) redirect(await portalUrl(user));
  const priceId = process.env[info.stripePriceEnv!];
  if (!priceId) throw new Error(`${info.stripePriceEnv} is not set.`);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await ensureCustomer(user),
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { kind: "plan", userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
    success_url: `${appUrl()}/checkout/done?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/pricing?payment=cancelled`,
  });
  redirect(session.url!);
}

async function portalUrl(user: Parameters<typeof ensureCustomer>[0]) {
  const s = await stripe().billingPortal.sessions.create({ customer: await ensureCustomer(user), return_url: `${appUrl()}/account` });
  return s.url;
}

export async function openBillingPortal() {
  const user = await requireUser("/account");
  if (fakePayments()) {
    await setPlan(user.id, "FREE", { planRenewsAt: null });
    redirect("/account?plan=cancelled");
  }
  redirect(await portalUrl(user));
}
