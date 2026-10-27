import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/providers";
import { approveNpi } from "@/app/actions/team";
import { questionPath } from "@/lib/paths";
import { SERVICES } from "@/lib/plans";
import { timeAgo } from "@/lib/sla";
import { formatDate } from "@/lib/articles";
import { payerLabel } from "@/lib/taxonomy";
import { SubmitButton } from "@/components/SubmitButton";
import { slaText } from "@/components/ui";

export const metadata: Metadata = { title: "Provider", robots: { index: false } };

const STATUS: Record<string, string> = { OPEN: "Waiting for answer", ANSWERED: "Answered", SOLVED: "Solved", PENDING_PAYMENT: "Pending" };

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await getProvider(id);
  if (!data) notFound();
  const { u, questions, requests } = data;
  const open = questions.filter(({ q }) => q.status === "OPEN" && !q.removed).length;
  return (
    <>
      <div className="pagehead"><Link className="back" href="/team/providers">← Providers</Link>
        <h1>{u.name}</h1>
        <p className="muted small" style={{ margin: 0 }}>{[u.practiceName, u.specialty, u.state].filter(Boolean).join(" · ")}</p>
      </div>

      <div className="ruleset" style={{ marginBottom: 20 }}>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{questions.length}</b>questions asked{open ? <span className="sla late"> · {open} open</span> : null}</div>
        <div><b style={{ fontFamily: "var(--f-mono)", fontSize: 20 }}>{requests.length}</b>service requests</div>
        <div><b style={{ fontSize: 15 }}>{formatDate(u.createdAt)}</b>joined</div>
        <div><b style={{ fontSize: 15 }}>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</b>last sign-in</div>
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Account</h2>
        <dl className="contact-list">
          <dt>Email</dt><dd><a href={`mailto:${u.email}`}>{u.email}</a></dd>
          <dt>Practice</dt><dd>{u.practiceName ?? "—"}</dd>
          <dt>Specialty</dt><dd>{u.specialty ?? "—"}</dd>
          <dt>State</dt><dd>{u.state ?? "—"}</dd>
          <dt>NPI</dt><dd>{u.npi ?? "Not added"}{u.npi && (u.npiVerifiedAt ? <> · <span className="status-pill PUBLISHED">Verified {formatDate(u.npiVerifiedAt)}</span></> : <> · <span className="status-pill">Not verified</span></>)}{u.npiNote ? <div className="small muted">Registry: {u.npiNote}</div> : null}</dd>
          <dt>Email alerts</dt><dd>{u.emailNotifications ? "On" : "Off (won't get answer emails)"}</dd>
          <dt>Status</dt><dd>{u.disabledAt ? `Turned off ${formatDate(u.disabledAt)}` : "Active"}</dd>
        </dl>
        {u.npi && !u.npiVerifiedAt && (
          <form action={approveNpi}><input type="hidden" name="userId" value={u.id} /><SubmitButton className="btn sm ghost">Approve NPI</SubmitButton></form>
        )}
      </section>

      <section className="section" style={{ marginTop: 0 }}>
        <h2>Questions</h2>
        <div className="tablewrap"><table>
          <thead><tr><th>Question</th><th>Visibility</th><th>Status</th><th>Replies</th><th>Asked</th><th></th></tr></thead>
          <tbody>
            {questions.length ? questions.map(({ q, replies, expert }) => {
              const s = slaText(q);
              return (
                <tr key={q.id}>
                  <td style={{ minWidth: 240 }}><strong>{q.title}</strong><div className="chips" style={{ marginTop: 4 }}>{q.codes.slice(0, 3).map((c) => <span key={c} className="chip code">{c}</span>)}<span className="chip payer">{payerLabel(q.payerGroup, q.payerName)}</span></div></td>
                  <td className="small">{q.isPrivate ? "Private" : "Public"}{q.hidden ? <div className="sla late">Hidden (PHI report)</div> : null}{q.removed ? <div className="sla late">Removed</div> : null}</td>
                  <td className="small">{STATUS[q.status] ?? q.status}<div className={`sla ${s.cls}`}>{s.text}</div></td>
                  <td className="small">{replies}{expert ? ` (${expert} expert)` : ""}</td>
                  <td className="small">{timeAgo(q.createdAt)}</td>
                  <td>{!q.removed && <Link className="btn sm" href={questionPath(q)}>{q.status === "OPEN" ? "Answer" : "Open"}</Link>}</td>
                </tr>);
            }) : <tr><td colSpan={6} className="empty">No questions yet.</td></tr>}
          </tbody>
        </table></div>
      </section>

      <section className="section">
        <h2>Service requests</h2>
        <div className="qlist">
          {requests.length ? requests.map((r) => (
            <div key={r.id} className="mqrow"><div className="body">
              <div className="eyebrow">{SERVICES.find((s) => s.id === r.service)?.name ?? r.service} · {timeAgo(r.createdAt)} · <span className={`status-pill ${r.status === "WON" ? "PUBLISHED" : ""}`}>{r.status}</span></div>
              <h3 style={{ margin: "4px 0" }}>{r.practiceName} <span className="muted small" style={{ fontWeight: 400 }}>· {r.contactName} · {r.email}</span></h3>
              <div className="small muted">{[r.claimsPerMonth && `${r.claimsPerMonth} claims/mo`, r.payers].filter(Boolean).join(" · ")}</div>
              {r.note && <div className="small" style={{ marginTop: 4, whiteSpace: "pre-line" }}>{r.note}</div>}
            </div></div>))
            : <div className="empty">No service requests.</div>}
        </div>
      </section>
    </>
  );
}
