import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isStaff, requireUser } from "@/lib/auth";
import { ANSWER_TIME, SERVICES } from "@/lib/plans";
import { questionPath } from "@/lib/paths";
import { timeAgo } from "@/lib/sla";
import { setEmailNotifications } from "@/app/actions/account";
import { NpiForm } from "@/components/NpiForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, TierChips, slaText } from "@/components/ui";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<{ welcome?: string; password?: string }> }) {
  const user = await requireUser("/account");
  const sp = await searchParams;
  const changed = sp.password === "changed" && <div className="phi ok" style={{ marginBottom: 14 }}>Your password is changed. You’ve been signed out on other devices.</div>;
  if (isStaff(user)) {
    return <>{changed}<div className="card"><div className="form"><h1>{user.name}</h1><p className="muted" style={{ margin: 0 }}>Team account{user.credentials ? ` · ${user.credentials}` : ""}.</p>
      <EmailToggle on={user.emailNotifications} staff /><div><Link className="btn" href="/team">Open team queue</Link></div></div></div></>;
  }
  const requests = await db.select().from(schema.serviceRequests).where(eq(schema.serviceRequests.userId, user.id)).orderBy(desc(schema.serviceRequests.createdAt)).limit(10);
  const mine = await db.select().from(schema.questions).where(eq(schema.questions.authorId, user.id)).orderBy(desc(schema.questions.createdAt)).limit(25);

  return (
    <>
      {changed}
      {sp.welcome && <div className="phi ok" style={{ marginBottom: 14 }}>Welcome. Verify your NPI below to get the Verified Provider badge, then ask your first question.</div>}
      <div className="pagehead"><span className="eyebrow">Account</span><h1>{user.name}</h1>
        <div className="byline" style={{ marginTop: 0 }}>{user.practiceName} · {user.state} · {user.specialty} <Badge user={user} /></div></div>

      <div className="row2" style={{ alignItems: "start" }}>
        <div className="card"><div className="form">
          <h2>BillerBench is free</h2>
          <p className="muted small" style={{ margin: 0 }}>Ask as many questions as you need. Our certified billers answer within {ANSWER_TIME.label}.</p>
          <div className="small"><strong>Billing services</strong>
            {requests.length
              ? <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{requests.map((r) => <li key={r.id}>{SERVICES.find((x) => x.id === r.service)?.name ?? r.service} · {r.status === "NEW" ? "Received" : r.status === "CONTACTED" ? "In discussion" : r.status === "WON" ? "Active" : "Closed"} · {timeAgo(r.createdAt)}</li>)}</ul>
              : <p className="muted" style={{ margin: "4px 0 0" }}>Need help with billing, eligibility, prior auths or denials? We can take it on.</p>}
          </div>
          <div><Link className="btn sm" href="/services">See billing services</Link></div>
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
