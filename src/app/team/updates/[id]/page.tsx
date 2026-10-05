import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { articlePath } from "@/lib/articles";
import { deleteArticle } from "@/app/actions/articles";
import { ArticleForm } from "@/components/ArticleForm";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Edit update", robots: { index: false } };

export default async function EditUpdate({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const [a] = await db.select().from(schema.articles).where(eq(schema.articles.id, id));
  if (!a) notFound();
  return (
    <>
      <Link className="back" href="/team/updates">← Articles and updates</Link>
      <div className="pagehead"><span className="eyebrow">Admin · {a.status === "PUBLISHED" ? "Published" : "Draft"}</span><h1>Edit update</h1>
        {a.status === "PUBLISHED" && <p className="small" style={{ margin: 0 }}><Link href={articlePath(a)}>View the public page</Link></p>}</div>
      {sp.saved && <div className="phi ok" style={{ marginBottom: 14 }}>Draft saved. It isn’t public until you publish it.</div>}
      <div style={{ maxWidth: 860 }}>
        <ArticleForm initial={{
          id: a.id, kind: a.kind, status: a.status, title: a.title, summary: a.summary, body: a.body, codes: a.codes, payers: a.payers,
          specialty: a.specialty, sourceUrl: a.sourceUrl, effectiveDate: a.effectiveDate ? a.effectiveDate.toISOString().slice(0, 10) : "",
        }} />
        <details className="card" style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--dropout)" }}>Delete this update</summary>
          <form action={deleteArticle} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
            <input type="hidden" name="id" value={a.id} /><input type="hidden" name="confirm" value="yes" />
            <span className="small muted">This removes it for good, including its public page.</span>
            <SubmitButton className="btn sm" pendingText="Deleting…">Yes, delete it</SubmitButton>
          </form>
        </details>
      </div>
    </>
  );
}
