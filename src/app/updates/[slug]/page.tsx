import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { ARTICLE_KINDS, articlePath, formatDate } from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { questionPath } from "@/lib/paths";
import { appUrl } from "@/lib/site";

const load = cache(async (slug: string) => {
  const user = await getCurrentUser();
  const A = schema.articles, U = schema.users;
  const [row] = await db.select({ a: A, author: U }).from(A).innerJoin(U, eq(U.id, A.authorId)).where(eq(A.slug, slug)).limit(1);
  // Drafts are visible only to admins, so they can check them before publishing.
  if (!row || (row.a.status !== "PUBLISHED" && !isAdmin(user))) return null;
  return { ...row, user };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Update not found", robots: { index: false } };
  return {
    title: d.a.title,
    description: d.a.summary,
    alternates: { canonical: articlePath(d.a) },
    robots: { index: d.a.status === "PUBLISHED", follow: true },
    openGraph: { title: d.a.title, description: d.a.summary, type: "article", publishedTime: d.a.publishedAt?.toISOString() },
  };
}

export default async function UpdatePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ published?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const d = await load(slug);
  if (!d) notFound();
  const { a, author, user } = d;
  const Q = schema.questions, A = schema.articles;
  const codeArr = a.codes.length ? sql`ARRAY[${sql.join(a.codes.map((c) => sql`${c}`), sql`, `)}]::text[]` : null;
  const [related, more] = await Promise.all([
    codeArr ? db.select().from(Q).where(and(eq(Q.isPrivate, false), eq(Q.removed, false), eq(Q.hidden, false), ne(Q.status, "PENDING_PAYMENT"), ne(Q.status, "OPEN"), sql`${Q.codes} && ${codeArr}`)).orderBy(desc(Q.voteCount)).limit(5) : Promise.resolve([]),
    db.select().from(A).where(and(eq(A.status, "PUBLISHED"), ne(A.id, a.id))).orderBy(desc(A.publishedAt)).limit(3),
  ]);
  const jsonLd = a.status === "PUBLISHED" ? {
    "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.summary,
    datePublished: a.publishedAt?.toISOString(), dateModified: a.updatedAt.toISOString(),
    author: { "@type": "Person", name: author.name }, publisher: { "@type": "Organization", name: "BillerBench" },
    mainEntityOfPage: appUrl() + articlePath(a),
  } : null;

  return (
    <div className="grid askgrid">
      <article className="article" style={{ minWidth: 0 }}>
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
        <Link className="back" href="/updates">← All updates</Link>
        {sp.published && <div className="phi ok" style={{ marginBottom: 12 }}>Published. This page is now public.</div>}
        {a.status !== "PUBLISHED" && <div className="banner" style={{ marginBottom: 12 }}><strong>Draft</strong><span className="muted">Only admins can see this page until it’s published.</span></div>}
        <div className="chips" style={{ marginBottom: 10 }}><span className={`kind ${a.kind}`}>{ARTICLE_KINDS[a.kind].label}</span>
          {a.effectiveDate && <span className="chip payer">Effective {formatDate(a.effectiveDate)}</span>}</div>
        <h1>{a.title}</h1>
        <p className="muted" style={{ fontSize: 17, margin: "10px 0 14px" }}>{a.summary}</p>
        <div className="byline" style={{ marginTop: 0, marginBottom: 18 }}>
          By {author.name}{author.credentials ? `, ${author.credentials}` : ""}{a.publishedAt ? ` · ${formatDate(a.publishedAt)}` : ""}
          {a.updatedAt.getTime() - (a.publishedAt?.getTime() ?? 0) > 86400_000 && a.publishedAt ? ` · Updated ${formatDate(a.updatedAt)}` : ""}
          {isAdmin(user) && <> · <Link href={`/team/updates/${a.id}`}>Edit</Link></>}
        </div>
        {(a.codes.length > 0 || a.payers.length > 0 || a.specialty) && (
          <div className="chips" style={{ marginBottom: 18 }}>
            {a.codes.map((c) => <Link key={c} className="chip code" href={`/?code=${encodeURIComponent(c)}`} style={{ textDecoration: "none" }}>{c}</Link>)}
            {a.payers.map((p) => <span key={p} className="chip payer">{p}</span>)}
            {a.specialty && <span className="chip spec">{a.specialty}</span>}
          </div>)}
        <div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />
        {a.sourceUrl && <p className="small" style={{ marginTop: 18 }}>Official source: <a href={a.sourceUrl} target="_blank" rel="noopener nofollow">{a.sourceUrl.replace(/^https:\/\//, "").slice(0, 70)}</a></p>}
        <div className="offer">
          <div><span className="eyebrow">Question about this change?</span><h3>Ask our certified billers</h3><p>Free for providers. A certified biller answers within 1 business day.</p><Link className="btn sm" href="/ask">Ask a question</Link></div>
          <div><span className="eyebrow">Want it handled?</span><h3>Let us update your billing</h3><p>We can review your claims for this change and fix denials.</p><Link className="btn sm ghost" href="/services?service=audit#request">Request a review</Link></div>
        </div>
      </article>
      <aside className="side">
        {related.length > 0 && <div className="card"><div className="eyebrow" style={{ marginBottom: 8 }}>Answered questions</div>
          <div className="mini">{related.map((q) => <Link key={q.id} href={questionPath(q)}>{q.title}</Link>)}</div></div>}
        {more.length > 0 && <div className="card"><div className="eyebrow" style={{ marginBottom: 8 }}>More updates</div>
          <div className="mini">{more.map((m) => <Link key={m.id} href={articlePath(m)}>{m.title}</Link>)}</div></div>}
      </aside>
    </div>
  );
}
