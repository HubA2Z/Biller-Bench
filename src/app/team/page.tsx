import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, isNotNull, isNull, sql, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import { isAdmin, requireStaff } from "@/lib/auth";
import { questionPath } from "@/lib/paths";
import { PLANS, SERVICES, dollars } from "@/lib/plans";
import { renderMarkdown } from "@/lib/markdown";
import { payerLabel } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/sla";
import { startOfMonth } from "@/lib/queries";
import { approveNpi, resolveFlag, setLeadStatus } from "@/app/actions/team";
import { SubmitButton } from "@/components/SubmitButton";
import { TierChips, slaText } from "@/components/ui";

export const metadata: Metadata = { title: "Team queue", robots: { index: false } };

export default async function Team() {
  const me = await requireStaff();
  const { questions: Q, users: U, answers: A, flags: F, serviceRequests: S } = schema;
  const AQ = alias(Q, "aq");

  const [open, leads, reports, npiReview, planRows, [{ urgent }]] = await Promise.all([
    db.select({ q: Q, org: U.practiceName, name: U.name, plan: U.plan }).from(Q).innerJoin(U, eq(U.id, Q.authorId))
      .where(and(eq(Q.status, "OPEN"), eq(Q.removed, false))).orderBy(sql`${Q.dueAt} asc nulls last`).limit(200),
    db.select().from(S).where(eq(S.status, "NEW")).orderBy(desc(S.createdAt)).limit(100),
    db.select({ f: F, reporter: U.name, q: Q, a: A, aq: AQ }).from(F).innerJoin(U, eq(U.id, F.reporterId))
      .leftJoin(Q, eq(Q.id, F.questionId)).leftJoin(A, eq(A.id, F.answerId)).leftJoin(AQ, eq(AQ.id, A.questionId))
      .where(eq(F.status, "OPEN")).orderBy(asc(F.createdAt)),
    db.select().from(U).where(and(eq(U.role, "PROVIDER"), isNotNull(U.npi), isNull(U.npiVerifiedAt))).limit(50),
    db.select({ plan: U.plan, n: count() }).from(U).where(eq(U.role, "PROVIDER")).groupBy(U.plan),
    db.select({ urgent: count() }).from(Q).where(and(eq(Q.tier, "URGENT"), isNotNull(Q.paidAt), gte(Q.paidAt, startOfMonth()))),
  ]);
  const mrr = planRows.reduce((s, r) => s + PLANS[r.plan].priceCents * r.n, 0);
  const overdue = open.filter(({ q }) => q.dueAt && q.dueAt < new Date()).length;

  return (
    <>
      <div className="pagehead"><span className="eyebrow">Staff view</span>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}><h1>Team queue</h1>
          {isAdmin(me) && <Link className="btn sm ghost" href="/team/members">Manage team members</Link>}</div>
        <p className="muted small" style={{ margin: 0 }}>Sorted by due time. Paid questions come first because their clock is shorter.</p></div>
      <div className="ruleset" style={{ marginBottom: 22 }}>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{open.length}</b>open questions{overdue ? <span className="sla late"> · {overdue} overdue</span> : null}</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{dollars(mrr)}</b>monthly plan revenue</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{urgent}</b>paid urgent questions this month</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{leads.length}</b>new service requests</div>
      </div>

      <section className="section" style={{ marginTop: 0 }}><h2>Open questions</h2>
        <div className="tablewrap"><table><thead><tr><th>Due</th><th>Question</th><th>Tier</th><th>Practice</th><th></th></tr></thead><tbody>
          {open.length ? open.map(({ q, org, name, plan }) => { const s = slaText(q); return (
            <tr key={q.id}>
              <td><span className={`sla ${s.cls}`} style={{ whiteSpace: "nowrap" }}>{s.text.replace("Free queue · ", "")}</span></td>
              <td style={{ minWidth: 240 }}><strong>{q.title}</strong><div className="chips" style={{ marginTop: 4 }}>{q.codes.slice(0, 3).map((c) => <span key={c} className="chip code">{c}</span>)}<span className="chip payer">{payerLabel(q.payerGroup, q.payerName)}</span></div></td>
              <td><div className="chips">{q.tier === "FREE" && !q.isPrivate ? <span className="chip spec">Free</span> : <TierChips q={q} authorPlan={plan} />}</div></td>
              <td className="small">{org ?? name}</td>
              <td><Link className="btn sm" href={questionPath(q)}>Answer</Link></td>
            </tr>); })
            : <tr><td colSpan={5} className="empty">Queue is clear.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="section"><h2>Service requests</h2><div className="qlist">
        {leads.length ? leads.map((l) => (
          <div key={l.id} className="mqrow"><div className="body">
            <div className="eyebrow">{SERVICES.find((s) => s.id === l.service)?.name ?? l.service} · {timeAgo(l.createdAt)}</div>
            <h3 style={{ margin: "4px 0" }}>{l.practiceName} <span className="muted small" style={{ fontWeight: 400 }}>· {l.contactName} · {l.email}</span></h3>
            <div className="small muted">{[l.claimsPerMonth && `${l.claimsPerMonth} claims/mo`, l.payers].filter(Boolean).join(" · ")}</div>
            {l.note && <div className="small" style={{ marginTop: 4 }}>{l.note}</div>}
          </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["CONTACTED", "WON", "LOST"] as const).map((st) => (
                <form key={st} action={setLeadStatus}><input type="hidden" name="leadId" value={l.id} /><input type="hidden" name="status" value={st} />
                  <SubmitButton className="btn sm ghost">{st === "CONTACTED" ? "Contacted" : st === "WON" ? "Won" : "Lost"}</SubmitButton></form>))}
            </div></div>))
          : <div className="empty">No new requests.</div>}
      </div></section>

      <section className="section"><h2>PHI reports</h2><div className="qlist">
        {reports.length ? reports.map(({ f, reporter, q, a, aq }) => (
          <div key={f.id} className="mqrow"><div className="body">
            <div className="eyebrow">{q ? "Question" : "Reply"} · reported by {reporter} · {timeAgo(f.createdAt)}</div>
            <h3 style={{ margin: "4px 0" }}>{(q ?? aq)?.title}</h3>
            <div className="small" dangerouslySetInnerHTML={{ __html: renderMarkdown(((q?.body ?? a?.body) || "").slice(0, 400)) }} />
          </div>
            <div style={{ display: "flex", gap: 8 }}>
              <form action={resolveFlag}><input type="hidden" name="flagId" value={f.id} /><input type="hidden" name="decision" value="restore" /><SubmitButton className="btn sm ghost">Restore</SubmitButton></form>
              <form action={resolveFlag}><input type="hidden" name="flagId" value={f.id} /><input type="hidden" name="decision" value="remove" /><SubmitButton className="btn sm">Remove</SubmitButton></form>
            </div></div>))
          : <div className="empty">No open reports.</div>}
      </div></section>

      <section className="section"><h2>NPI review</h2><div className="qlist">
        {npiReview.length ? npiReview.map((u) => (
          <div key={u.id} className="mqrow"><div className="body"><h3 style={{ margin: 0 }}>{u.name} <span className="muted small" style={{ fontWeight: 400 }}>· {u.practiceName}</span></h3>
            <div className="small muted">NPI {u.npi} · Registry: {u.npiNote ?? "no result"}</div></div>
            <form action={approveNpi}><input type="hidden" name="userId" value={u.id} /><SubmitButton className="btn sm ghost">Approve NPI</SubmitButton></form></div>))
          : <div className="empty">Nothing to review.</div>}
      </div></section>
    </>
  );
}
