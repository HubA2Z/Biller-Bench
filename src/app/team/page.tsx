import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, isNotNull, isNull, sql, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import { isAdmin, requireStaff } from "@/lib/auth";
import { questionPath } from "@/lib/paths";
import { SERVICES } from "@/lib/plans";
import { renderMarkdown } from "@/lib/markdown";
import { payerLabel } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/sla";
import { startOfMonth } from "@/lib/queries";
import { approveNpi, resolveFlag, setLeadStatus } from "@/app/actions/team";
import { setInquiryStatus } from "@/app/actions/inquiries";
import { setQAStatus } from "@/app/actions/qa";
import { CAREER_ROLES } from "@/lib/company";
import { AUDIENCE_ROLES } from "@/lib/audience";
import { SubmitButton } from "@/components/SubmitButton";
import { TierChips, slaText } from "@/components/ui";

export const metadata: Metadata = { title: "Team queue", robots: { index: false } };

export default async function Team() {
  const me = await requireStaff();
  const { questions: Q, users: U, answers: A, flags: F, serviceRequests: S, inquiries: I, audienceResponses: AR } = schema;
  const QD = schema.questions;
  const AQ = alias(Q, "aq");

  const since = new Date(Date.now() - 30 * 86400_000);
  const [open, leads, reports, npiReview, [{ providers }], [{ askedThisMonth }], messages, roleCounts, buyerPages, [{ verifiedProviders }], qaDrafts] = await Promise.all([
    db.select({ q: Q, org: U.practiceName, name: U.name, plan: U.plan }).from(Q).innerJoin(U, eq(U.id, Q.authorId))
      .where(and(eq(Q.status, "OPEN"), eq(Q.removed, false))).orderBy(sql`${Q.dueAt} asc nulls last`).limit(200),
    db.select().from(S).where(eq(S.status, "NEW")).orderBy(desc(S.createdAt)).limit(100),
    db.select({ f: F, reporter: U.name, q: Q, a: A, aq: AQ }).from(F).innerJoin(U, eq(U.id, F.reporterId))
      .leftJoin(Q, eq(Q.id, F.questionId)).leftJoin(A, eq(A.id, F.answerId)).leftJoin(AQ, eq(AQ.id, A.questionId))
      .where(eq(F.status, "OPEN")).orderBy(asc(F.createdAt)),
    db.select().from(U).where(and(eq(U.role, "PROVIDER"), isNotNull(U.npi), isNull(U.npiVerifiedAt))).limit(50),
    db.select({ providers: count() }).from(U).where(eq(U.role, "PROVIDER")),
    db.select({ askedThisMonth: count() }).from(Q).where(and(gte(Q.createdAt, startOfMonth()), eq(Q.removed, false))),
    db.select().from(I).where(eq(I.status, "NEW")).orderBy(desc(I.createdAt)).limit(100),
    db.select({ role: AR.role, n: count(), yes: sql<number>`count(*) filter (where ${AR.wantsHelp})::int` }).from(AR).where(gte(AR.createdAt, since)).groupBy(AR.role),
    // Pages where physicians and practice managers answered: what brings potential clients in.
    db.select({ path: AR.path, n: count() }).from(AR)
      .where(and(gte(AR.createdAt, since), sql`${AR.role} in ('physician','practice')`, isNotNull(AR.path)))
      .groupBy(AR.path).orderBy(desc(count())).limit(8),
    db.select({ verifiedProviders: count() }).from(U).where(and(eq(U.role, "PROVIDER"), isNotNull(U.npiVerifiedAt))),
    db.select().from(QD).where(and(eq(QD.draft, true), eq(QD.removed, false))).orderBy(desc(QD.createdAt)).limit(100),
  ]);
  const totalAnswers = roleCounts.reduce((a, r) => a + r.n, 0);
  const overdue = open.filter(({ q }) => q.dueAt && q.dueAt < new Date()).length;

  return (
    <>
      <div className="pagehead"><span className="eyebrow">Staff view</span>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}><h1>Team queue</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link className="btn sm ghost" href="/team/denials">Denial code pages</Link>{isAdmin(me) && <><Link className="btn sm ghost" href="/team/updates">Articles and updates</Link><Link className="btn sm ghost" href="/team/members">Manage team members</Link></>}</div></div>
        <p className="muted small" style={{ margin: 0 }}>Sorted by due time. Every question is due within one business day.</p></div>
      <div className="ruleset" style={{ marginBottom: 22 }}>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{open.length}</b>open questions{overdue ? <span className="sla late"> · {overdue} overdue</span> : null}</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{askedThisMonth}</b>questions this month</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{providers}</b>provider accounts</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{leads.length}</b>new service requests</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{messages.length}</b>new messages and applications</div>
      </div>

      <section className="section" style={{ marginTop: 0, marginBottom: 22 }}>
        <h2>Who’s visiting <span className="muted small" style={{ fontFamily: "var(--f-body)", fontWeight: 400 }}>· last 30 days · {totalAnswers} answer{totalAnswers === 1 ? "" : "s"} to “Who’s reading?” · {verifiedProviders} NPI-verified provider account{verifiedProviders === 1 ? "" : "s"}</span></h2>
        {totalAnswers ? (
          <div className="ruleset">
            {Object.entries(AUDIENCE_ROLES).map(([k, v]) => {
              const n = roleCounts.find((r) => r.role === k)?.n ?? 0;
              const yes = roleCounts.find((r) => r.role === k)?.yes ?? 0;
              return <div key={k}><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{Math.round((n / totalAnswers) * 100)}%</b>{v.label} <span className="muted">({n}{v.followUp ? ` · ${yes} wanted billing help` : ""})</span></div>;
            })}
          </div>
        ) : <div className="empty">No answers yet. First-time visitors see a small “Who’s reading?” card after a few seconds.</div>}
        {buyerPages.length > 0 && (
          <div className="card" style={{ marginTop: 10 }}><div className="eyebrow" style={{ marginBottom: 6 }}>Pages where physicians and practice managers answered</div>
            <div className="mini">{buyerPages.map((p) => <Link key={p.path} href={p.path!}>{p.path} <span className="muted">({p.n})</span></Link>)}</div></div>)}
      </section>

      <section className="section" style={{ marginTop: 0 }}><h2>Open questions</h2>
        <div className="tablewrap"><table><thead><tr><th>Due</th><th>Question</th><th>Visibility</th><th>Practice</th><th></th></tr></thead><tbody>
          {open.length ? open.map(({ q, org, name }) => { const s = slaText(q); return (
            <tr key={q.id}>
              <td><span className={`sla ${s.cls}`} style={{ whiteSpace: "nowrap" }}>{s.text.replace("Free queue · ", "")}</span></td>
              <td style={{ minWidth: 240 }}><strong>{q.title}</strong><div className="chips" style={{ marginTop: 4 }}>{q.codes.slice(0, 3).map((c) => <span key={c} className="chip code">{c}</span>)}<span className="chip payer">{payerLabel(q.payerGroup, q.payerName)}</span></div></td>
              <td><div className="chips">{q.isPrivate ? <TierChips q={q} /> : <span className="chip spec">Public</span>}</div></td>
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

      <section className="section" id="messages"><h2>Messages and job applications</h2><div className="qlist">
        {messages.length ? messages.map((m) => (
          <div key={m.id} className="mqrow"><div className="body">
            <div className="eyebrow">{m.kind === "CAREER" ? `Application · ${CAREER_ROLES.find((r) => r.id === m.role)?.title ?? m.role}` : `Contact · ${m.topic}`} · {timeAgo(m.createdAt)}</div>
            <h3 style={{ margin: "4px 0" }}>{m.name}{m.organization ? <span className="muted small" style={{ fontWeight: 400 }}> · {m.organization}</span> : null} <span className="muted small" style={{ fontWeight: 400 }}>· <a href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}</span></h3>
            {(m.experience || m.link) && <div className="small muted">{m.experience}{m.experience && m.link ? " · " : ""}{m.link && /^https:\/\//i.test(m.link) ? <a href={m.link} target="_blank" rel="noopener noreferrer nofollow">Profile / resume</a> : null}</div>}
            <div className="small" style={{ marginTop: 4, whiteSpace: "pre-line" }}>{m.message}</div>
          </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
              {m.kind === "CONTACT" && /^(Denial help|Billing question)/.test(m.topic ?? "") && (
                m.questionId ? <span className="status-pill PUBLISHED">Published as Q&amp;A</span>
                  : <Link className="btn sm" href={`/team/qa/new?from=${m.id}`} title={m.shareOk ? "Sender agreed to anonymous publishing" : "No permission: publish only a rewritten general question"}>Publish as Q&amp;A{m.shareOk ? "" : " *"}</Link>)}
              {(["REVIEWED", "ARCHIVED"] as const).map((st) => (
                <form key={st} action={setInquiryStatus}><input type="hidden" name="inquiryId" value={m.id} /><input type="hidden" name="status" value={st} />
                  <SubmitButton className="btn sm ghost">{st === "REVIEWED" ? "Mark reviewed" : "Archive"}</SubmitButton></form>))}
            </div></div>))
          : <div className="empty">No new messages.</div>}
      </div></section>

      <section className="section" id="qa-drafts">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
          <h2>Q&amp;A drafts <span className="muted small" style={{ fontFamily: "var(--f-body)", fontWeight: 400 }}>· common questions and reader questions waiting for review</span></h2>
          <Link className="btn sm ghost" href="/team/qa/new">Write a common question</Link></div>
        <div className="qlist">
          {qaDrafts.length ? qaDrafts.map((q) => (
            <div key={q.id} className="mqrow"><div className="body">
              <div className="eyebrow">{q.source === "reader" ? "Reader question" : "Common question"} · {q.codes.slice(0, 3).join(", ")} · {timeAgo(q.createdAt)}</div>
              <h3 style={{ margin: "4px 0" }}>{q.title}</h3>
            </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn sm ghost" href={`/team/qa/${q.id}`}>Review</Link>
                <form action={setQAStatus}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="action" value="publish" /><SubmitButton className="btn sm">Publish</SubmitButton></form>
                <form action={setQAStatus}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="action" value="delete" /><SubmitButton className="btn sm ghost">Delete</SubmitButton></form>
              </div></div>))
            : <div className="empty">No drafts. Files in content/questions load here on each deploy, and you can publish answered messages from the section above.</div>}
        </div>
      </section>

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
