import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { stripe } from "@/lib/stripe";
import { finalizeUrgentPayment, syncSubscription } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.metadata?.kind === "urgent" && s.payment_status === "paid" && s.metadata.questionId) {
        await finalizeUrgentPayment(s.metadata.questionId, s.id);
      }
      if (s.metadata?.kind === "plan" && s.metadata.userId && typeof s.customer === "string") {
        await db.update(schema.users).set({ stripeCustomerId: s.customer }).where(eq(schema.users.id, s.metadata.userId));
        if (typeof s.subscription === "string") await syncSubscription(await stripe().subscriptions.retrieve(s.subscription));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
  }
  return Response.json({ received: true });
}
