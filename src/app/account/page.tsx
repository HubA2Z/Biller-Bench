import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isStaff, requireUser } from "@/lib/auth";
import { planQuestionsUsed } from "@/lib/queries";
import { PLANS, dollars } from "@/lib/plans";
import { questionPath } from "@/lib/paths";
import { timeAgo } from "@/lib/sla";
import { openBillingPortal } from "@/app/actions/billing";
import { setEmailNotifications } from "@/app/actions/account";
import { NpiForm } from "@/components/NpiForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, TierChips, slaText } from "@/components/ui";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<{ welcome?: string; plan?: string; password?: string }> }) {
  const user = await requireUser("/account");
  const sp = await searchParams;
  const changed = sp.password === "changed" && <div className="phi ok" style={{ marginBottom: 14 }}>Your password is changed. You’ve been signed out on other devices.</div>;
  if (isStaff(user)) {
    return <>{changed}<div className="card"><div className="form"><h1>{user.name}</h1><p className="muted" style={{ margin: 0 }}>Team account{user.credentials ? ` · ${user.credentials}` : ""}.</p>
      <EmailToggle on={user.emailNotifications} staff /><div><Link className="btn" href="/team">Open team queue</Link></div></div></div></>;
  }
  const plan = PLANS[user.plan];
  const used = await planQuestionsUsed(user.id);
  const mine = await db.select().from(schema.questions).where(eq(schema.questions.authorId, user.id)).orderBy(desc(schema.questions.createdAt)).limit(25);

  return (
    <>
      {changed}
      {sp.welcome && <div className="phi ok" style={{ marginBottom: 14 }}>Welcome. Verify your NPI below to get the Verified Provider badge, then ask your first question.</div>}
      {sp.plan === "updated" && <div className="phi ok" style={{ marginBottom: 14 }}>Your plan is updated.</div>}
      {sp.plan === "cancelled" && <div className="phi ok" style={{ marginBottom: 14 }}>You’re back on the Free plan.</div>}
      <div className="pagehead"><span className="eyebrow">Account</span><h1>{user.name}</h1>
        <div className="byline" style={{ marginTop: 0 }}>{user.practiceName} · {user.state} · {user.specialty} <Badge user={user} /></div></div>

      <div className="row2" style={{ alignItems: "start" }}>
        <div className="card"><div className="form">
          <h2>Plan</h2>
          <div><strong>{plan.name}</strong>{plan.priceCents ? ` · ${dollars(plan.priceCents)}/month` : ""}
            <div className="quota">{user.plan === "FREE" ? "Public questions, answered in 2–3 business days." : `${Math.max(0, plan.quota - used)} of ${plan.quota} private questions left this month · ${plan.slaLabel}`}</div>
            {user.planRenewsAt && <div className="quota">Renews {user.planRenewsAt.toLocaleDateString("en-US")}</div>}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn sm" href="/pricing">{user.plan === "FREE" ? "See plans" : "Change plan"}</Link>
            {user.plan !== "FREE" && <form action={openBillingPortal}><SubmitButton className="btn sm ghost" pendingText="Opening…">Manage billing</SubmitButton></form>}
          </div>
        </div></div>
        <div className="card"><div className="form">
          <h2>NPI verification</h2>
          {user.npiVerifiedAt ? <p className="ok-msg" style={{ margin: 0 }}>Verified · NPI {user.npi}{user.npiNote ? ` · ${user.npiNote}` : ""}</p> : <NpiForm npi={user.npi} />}
        </div></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}><div className="form"><h2>Email</h2><EmailToggle on={user.emailNotifications} /></div></div>

      <section className="section"><h2>Your questions</h2>
        <div className="qlist">
          {mine.length ? mine.map((q) => { const s = slaText(q); return (
            <Link key={q.id} className="qrow" href={questionPath(q)} style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
              <div style={{ minWidth: 0 }}><h3>{q.title}</h3><div className="chips"><TierChips q={q} authorPlan={user.plan} /></div>
                <div className="meta"><span className={`sla ${s.cls}`}>{s.text}</span><span>{timeAgo(q.createdAt)}</span></div></div>
            </Link>); })
            : <div className="empty">No questions yet. <Link className="clear" href="/ask">Ask your first one</Link>.</div>}
        </div>
      </section>
    </>
  );
}

function EmailToggle({ on, staff }: { on: boolean; staff?: boolean }) {
  return (
    <form action={setEmailNotifications} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="on" value={on ? "false" : "true"} />
      <span className="small">{staff ? "Alerts for paid questions, asker replies and service requests" : "Emails when our team answers or asks you a follow-up"}: <strong>{on ? "On" : "Off"}</strong></span>
      <SubmitButton className="btn sm ghost" pendingText="Saving…">{on ? "Turn off" : "Turn on"}</SubmitButton>
      <span className="hint" style={{ flexBasis: "100%" }}>Emails never include the title of a private question. Password emails are always sent.</span>
    </form>
  );
}
