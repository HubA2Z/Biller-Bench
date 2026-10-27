import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listProviders } from "@/lib/providers";
import { timeAgo } from "@/lib/sla";
import { formatDate } from "@/lib/articles";

export const metadata: Metadata = { title: "Providers", robots: { index: false } };

export default async function Providers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const rows = await listProviders(q);
  const verified = rows.filter((r) => r.u.npiVerifiedAt).length;
  const asked = rows.filter((r) => r.questions > 0).length;
  return (
    <>
      <div className="pagehead"><Link className="back" href="/team">← Team queue</Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <h1>Providers</h1>
          <a className="btn sm ghost" href={`/team/providers/export${q ? `?q=${encodeURIComponent(q)}` : ""}`}>Download CSV</a>
        </div>
        <p className="muted small" style={{ margin: 0 }}>{rows.length} provider account{rows.length === 1 ? "" : "s"}{q ? ` matching “${q}”` : ""} · {verified} NPI verified · {asked} have asked a question</p>
      </div>
      <form className="searchbar" method="get" style={{ marginBottom: 14 }}>
        <input type="search" name="q" defaultValue={q} placeholder="Search name, email, practice, NPI, state or specialty" aria-label="Search providers" />
        <button className="btn" type="submit">Search</button>
      </form>
      <div className="tablewrap"><table>
        <thead><tr><th>Provider</th><th>Practice</th><th>NPI</th><th>Questions</th><th>Service requests</th><th>Joined</th><th>Last sign-in</th></tr></thead>
        <tbody>
          {rows.length ? rows.map(({ u, questions, openQuestions, requests }) => (
            <tr key={u.id}>
              <td><Link href={`/team/providers/${u.id}`}><strong>{u.name}</strong></Link><div className="small muted">{u.email}</div>{u.disabledAt && <span className="status-pill">Turned off</span>}</td>
              <td className="small">{u.practiceName ?? "—"}<div className="muted">{[u.specialty, u.state].filter(Boolean).join(" · ")}</div></td>
              <td className="small">{u.npi ?? "—"}{u.npi && <div>{u.npiVerifiedAt ? <span className="status-pill PUBLISHED">Verified</span> : <span className="status-pill">Not verified</span>}</div>}</td>
              <td className="small">{questions}{openQuestions ? <div className="sla late">{openQuestions} open</div> : null}</td>
              <td className="small">{requests}</td>
              <td className="small">{formatDate(u.createdAt)}</td>
              <td className="small">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "—"}</td>
            </tr>))
            : <tr><td colSpan={7} className="empty">{q ? "No providers match." : "No provider accounts yet."}</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
