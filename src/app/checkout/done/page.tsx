import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { finalizeUrgentPayment, syncSubscription } from "@/lib/payments";
import { questionPath } from "@/lib/paths";

// Stripe sends the customer here after paying. The webhook is the source of
// truth; this page applies the same update right away so nobody waits.
export default async function CheckoutDone({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await requireUser();
  const { session_id } = await searchParams;
  if (!session_id) redirect("/account");
  const s = await stripe().checkout.sessions.retrieve(session_id);
  if (s.metadata?.userId !== user.id) redirect("/account");
  if (s.metadata?.kind === "urgent" && s.metadata.questionId) {
    if (s.payment_status === "paid") await finalizeUrgentPayment(s.metadata.questionId, s.id);
    const [q] = await db.select().from(schema.questions).where(eq(schema.questions.id, s.metadata.questionId));
    redirect(q ? questionPath(q) + "?paid=1" : "/");
  }
  if (s.metadata?.kind === "plan" && typeof s.subscription === "string") {
    await syncSubscription(await stripe().subscriptions.retrieve(s.subscription));
  }
  redirect("/account?plan=updated");
}
