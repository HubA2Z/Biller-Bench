import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { DENIAL_CATEGORIES, denialPath } from "@/lib/denials";
import { formatDate } from "@/lib/articles";
import { setDenialStatus } from "@/app/actions/denials";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Denial code pages", robots: { index: false } };

export default async function TeamDenials({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireStaff();
  const { saved } = await searchParams;
  const D = schema.denialCodes, U = schema.users;
  const rows = await db.select({ d: D, reviewer: U.name }).from(D).leftJoin(U, eq(U.id, D.reviewedById))
    .orderBy(sql`case when ${D.status} = 'DRAFT' then 0 else 1 end`, sql`length(${D.code})`, asc(D.code));
  const drafts = rows.filter((r) => r.d.status === "DRAFT").length;
  return (
    <>
      <div className="pagehead"><Link className="back" href="/team">← Team queue</Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <h1>Denial Code Library</h1><Link className="btn sm" href="/team/denials/new">Add a code</Link></div>
        <p className="muted small" style={{ margin: 0 }}>{rows.length} pages · {drafts} waiting for review. Open a draft, check it against the official sources, then publish. You’ll be shown as the reviewer.</p></div>
      {saved && <div className="phi ok" style={{ marginBottom: 12 }}>Saved {saved} as a draft.</div>}
      <div className="tablewrap"><table><thead><tr><th>Code</th><th>Category</th><th>Status</th><th>Reviewed</th><th></th></tr></thead><tbody>
        {rows.length ? rows.map(({ d, reviewer }) => (
          <tr key={d.id}>
            <td><strong style={{ fontFamily: "var(--f-mono)" }}>{d.groupCode}-{d.code}</strong><div className="small muted">{d.title.replace(/^[A-Z]{2}-\w+ Denial Code: /, "")}</div></td>
            <td className="small">{DENIAL_CATEGORIES[d.category as keyof typeof DENIAL_CATEGORIES]?.label ?? d.category}</td>
            <td><span className={`status-pill ${d.status}`}>{d.status === "PUBLISHED" ? "Published" : "Draft"}</span></td>
            <td className="small">{d.reviewedAt ? `${reviewer ?? "—"} · ${formatDate(d.reviewedAt)}` : "—"}</td>
            <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Link className="btn sm ghost" href={`/team/denials/${d.id}`}>Edit</Link>
              <Link className="btn sm ghost" href={denialPath(d)}>View</Link>
              <form action={setDenialStatus}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="status" value={d.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} />
                <SubmitButton className={`btn sm ${d.status === "PUBLISHED" ? "ghost" : ""}`}>{d.status === "PUBLISHED" ? "Unpublish" : "Publish"}</SubmitButton></form>
            </div></td>
          </tr>))
          : <tr><td colSpan={5} className="empty">No denial code pages yet. Files in content/denials are loaded as drafts on each deploy.</td></tr>}
      </tbody></table></div>
    </>
  );
}
