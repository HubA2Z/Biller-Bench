import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { ARTICLE_KINDS, articlePath, formatDate } from "@/lib/articles";

export const metadata: Metadata = { title: "Manage updates", robots: { index: false } };

export default async function ManageUpdates({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const A = schema.articles, U = schema.users;
  const rows = await db.select({ a: A, author: U.name }).from(A).innerJoin(U, eq(U.id, A.authorId)).orderBy(desc(A.updatedAt)).limit(200);
  return (
    <>
      <Link className="back" href="/team">← Team queue</Link>
      <div className="pagehead"><span className="eyebrow">Admin</span>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <h1>Articles and updates</h1><Link className="btn" href="/team/updates/new">Write an update</Link></div>
        <p className="muted small" style={{ margin: 0 }}>Published updates appear on the public Updates page and next to questions about the same codes. Drafts are only visible here.</p></div>
      {sp.deleted && <div className="phi ok" style={{ marginBottom: 14 }}>Deleted.</div>}
      <div className="tablewrap"><table>
        <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {rows.length ? rows.map(({ a, author }) => (
            <tr key={a.id}>
              <td style={{ minWidth: 260 }}><strong>{a.title}</strong><div className="small muted">by {author}{a.codes.length ? ` · ${a.codes.slice(0, 4).join(", ")}` : ""}</div></td>
              <td><span className={`kind ${a.kind}`}>{ARTICLE_KINDS[a.kind].label}</span></td>
              <td><span className={`status-pill ${a.status}`}>{a.status === "PUBLISHED" ? "Published" : "Draft"}</span></td>
              <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDate(a.updatedAt)}</td>
              <td><div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <Link className="btn sm ghost" href={`/team/updates/${a.id}`}>Edit</Link>
                {a.status === "PUBLISHED" && <Link className="btn sm ghost" href={articlePath(a)}>View</Link>}
              </div></td>
            </tr>))
            : <tr><td colSpan={5} className="empty">No updates yet. <Link className="clear" href="/team/updates/new">Write the first one</Link>.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
