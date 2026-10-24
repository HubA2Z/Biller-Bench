import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARTICLE_KINDS, articlePath, formatDate, type ArticleKind } from "@/lib/articles";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const sp = await searchParams;
  return { ...base, robots: { index: !Object.values(sp).some(Boolean), follow: true } }; // filtered lists stay out of Google
}

const base: Metadata = {
  title: "Medical Coding and Payer Policy Updates",
  description: "CPT, HCPCS and ICD-10 changes, payer policy updates and billing guides from certified medical billers.",
  alternates: { canonical: "/updates" },
};

export default async function Updates({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; code?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const A = schema.articles;
  const kind = (Object.keys(ARTICLE_KINDS) as ArticleKind[]).find((k) => k === sp.type);
  const conds: SQL[] = [eq(A.status, "PUBLISHED")];
  if (kind) conds.push(eq(A.kind, kind));
  const term = sp.q?.trim();
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(A.title, like), ilike(A.summary, like), sql`${term.toUpperCase()} = ANY(${A.codes})`)!);
  }
  if (sp.code) conds.push(sql`${sp.code.toUpperCase()} = ANY(${A.codes})`);
  const rows = await db.select().from(A).where(and(...conds)).orderBy(desc(A.publishedAt)).limit(100);
  const tab = (k?: ArticleKind) => { const p = new URLSearchParams(); if (k) p.set("type", k); if (term) p.set("q", term); const s = p.toString(); return s ? `/updates?${s}` : "/updates"; };

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">Updates</span>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <h1>Coding and payer updates</h1>
          {isAdmin(user) && <Link className="btn sm" href="/team/updates/new">Write an update</Link>}
        </div>
        <p className="muted" style={{ margin: 0, maxWidth: "64ch" }}>Code changes, payer policy changes and billing guides, written by our certified billers.</p>
      </div>
      <form className="searchbar" method="get">
        <input type="search" name="q" defaultValue={term} placeholder="Search updates or a code, e.g. G2211" aria-label="Search updates" />
        {kind && <input type="hidden" name="type" value={kind} />}
        <button className="btn ghost" type="submit">Search</button>
      </form>
      <div className="listhead">
        <span className="muted small"><strong style={{ color: "var(--ink)" }}>{rows.length}</strong> update{rows.length === 1 ? "" : "s"}{sp.code ? ` for ${sp.code.toUpperCase()}` : ""}</span>
        <div className="sort">
          <Link href={tab()} aria-pressed={!kind}>All</Link>
          {(Object.keys(ARTICLE_KINDS) as ArticleKind[]).map((k) => <Link key={k} href={tab(k)} aria-pressed={kind === k}>{ARTICLE_KINDS[k].plural}</Link>)}
        </div>
      </div>
      <div className="qlist alist">
        {rows.length ? rows.map((a) => (
          <Link key={a.id} className="arow" href={articlePath(a)}>
            <div className="chips"><span className={`kind ${a.kind}`}>{ARTICLE_KINDS[a.kind].label}</span>
              {a.effectiveDate && <span className="small muted">Effective {formatDate(a.effectiveDate)}</span>}</div>
            <h3>{a.title}</h3>
            <p>{a.summary}</p>
            <div className="meta">{a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}{a.codes.length > 0 && <span>{a.codes.slice(0, 5).join(" · ")}</span>}{a.payers.length > 0 && <span>{a.payers.slice(0, 3).join(", ")}</span>}</div>
          </Link>))
          : <div className="empty">No updates yet{term || kind ? " match this search" : ""}.</div>}
      </div>
    </>
  );
}
