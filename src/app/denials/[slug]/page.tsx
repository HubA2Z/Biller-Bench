import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { DENIAL_CATEGORIES, GROUP_CODES, codeFromParam, denialPath } from "@/lib/denials";
import { publishedDenialsFor, questionsMentioning } from "@/lib/denial-queries";
import { formatDate } from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { questionPath } from "@/lib/paths";
import { appUrl } from "@/lib/site";

const load = cache(async (param: string) => {
  const code = codeFromParam(param);
  if (!code) return null;
  const user = await getCurrentUser();
  const D = schema.denialCodes, U = schema.users;
  const [row] = await db.select({ d: D, reviewer: U }).from(D).leftJoin(U, eq(U.id, D.reviewedById)).where(eq(D.code, code)).limit(1);
  // Drafts are visible only to the team, so billers can review them before publishing.
  if (!row || (row.d.status !== "PUBLISHED" && !isStaff(user))) return null;
  return { ...row, user };
});

const describe = (s: string) => (s.length <= 158 ? s : s.slice(0, 155).replace(/\s+\S*$/, "") + "…");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug);
  if (!r) return { title: "Denial code not found", robots: { index: false } };
  const { d } = r;
  return {
    title: { absolute: `${d.title} | BillerBench` },
    description: describe(d.quickAnswer),
    alternates: { canonical: denialPath(d) },
    robots: { index: d.status === "PUBLISHED", follow: true },
    openGraph: { title: d.title, description: describe(d.quickAnswer), type: "article", url: denialPath(d) },
  };
}

export default async function DenialPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ published?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await load(slug);
  if (!r) notFound();
  const { d, reviewer, user } = r;
  if (slug !== d.slug) permanentRedirect(denialPath(d)); // /denials/97 and /denials/pr-97 land here
  const [related, questions] = await Promise.all([publishedDenialsFor(d.related), questionsMentioning(d.code)]);
  const name = `${d.groupCode}-${d.code}`;
  const cat = DENIAL_CATEGORIES[d.category as keyof typeof DENIAL_CATEGORIES];
  const url = appUrl() + denialPath(d);
  const jsonLd = d.status === "PUBLISHED" ? [
    { "@context": "https://schema.org", "@type": "Article", headline: d.title, description: describe(d.quickAnswer),
      datePublished: d.publishedAt?.toISOString(), dateModified: (d.reviewedAt ?? d.updatedAt).toISOString(),
      author: reviewer ? { "@type": "Person", name: reviewer.name, ...(reviewer.credentials ? { jobTitle: reviewer.credentials } : {}) } : { "@type": "Organization", name: "BillerBench" },
      publisher: { "@type": "Organization", name: "BillerBench", logo: { "@type": "ImageObject", url: `${appUrl()}/icon-512.png` } },
      mainEntityOfPage: url },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Denial Code Library", item: `${appUrl()}/denials` },
      { "@type": "ListItem", position: 2, name: cat?.label ?? "Denial codes", item: `${appUrl()}/denials` },
      { "@type": "ListItem", position: 3, name, item: url }] },
  ] : null;

  return (
    <div className="grid askgrid">
      <article className="article" style={{ minWidth: 0 }}>
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
        <div className="crumbs small" role="navigation" aria-label="Breadcrumb"><Link href="/denials">Denial Code Library</Link> › <span>{cat?.label}</span> › <span>{name}</span></div>
        {sp.published && <div className="phi ok" style={{ margin: "10px 0" }}>Published. This page is now public.</div>}
        {d.status !== "PUBLISHED" && <div className="banner" style={{ margin: "10px 0" }}><strong>Draft</strong><span className="muted">Only the team can see this page until it’s published.</span>{isStaff(user) && <Link className="clear" href={`/team/denials/${d.id}`}>Review and publish →</Link>}</div>}
        <h1 style={{ marginTop: 8 }}>{d.title}</h1>
        <div className="quick-answer"><span className="eyebrow">Quick answer</span><p>{d.quickAnswer}</p></div>
        <p className="small muted" style={{ margin: "0 0 18px" }}><strong>{d.groupCode}</strong>: {GROUP_CODES[d.groupCode as keyof typeof GROUP_CODES]}</p>
        <div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(d.body) }} />

        {related.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}><div className="eyebrow" style={{ marginBottom: 8 }}>Related denial codes</div>
            <div className="mini">{related.map((x) => <Link key={x.code} href={denialPath(x)}><strong>{x.groupCode}-{x.code}</strong> · {x.title.replace(/^[A-Z]{2}-\w+ Denial Code: /, "")}</Link>)}</div></div>)}
        {questions.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}><div className="eyebrow" style={{ marginBottom: 8 }}>Questions our billers answered about {name}</div>
            <div className="mini">{questions.map((q) => <Link key={q.id} href={questionPath(q)}>{q.title}</Link>)}</div></div>)}

        <div className="byline" style={{ marginTop: 18 }}>
          {reviewer && d.reviewedAt ? <>Reviewed by {reviewer.name}{reviewer.credentials ? `, ${reviewer.credentials}` : ""} · {formatDate(d.reviewedAt)}</> : "Not yet reviewed"}
          {isStaff(user) && <> · <Link href={`/team/denials/${d.id}`}>Edit</Link></>}
        </div>
        <p className="small muted">General billing guidance based on published payer and CMS policy. Payer rules change, so check the payer’s current policy for your claim.</p>

        <div className="offer">
          <div><span className="eyebrow">Still stuck on a {name}?</span><h3>Ask a certified biller, free</h3><p>Describe the claim (no patient details) and our team answers within 1 business day.</p><Link className="btn sm" href="/ask">Ask a question</Link></div>
          <div><span className="eyebrow">Want it handled?</span><h3>Have us fix this claim</h3><p>We correct and resubmit claims, write appeals, and audit repeat denials.</p><Link className="btn sm ghost" href="/services?service=appeal#request">Get a quote</Link></div>
        </div>
      </article>
      <aside className="rail">
        <div className="card"><div className="eyebrow" style={{ marginBottom: 6 }}>Look up another code</div>
          <form method="get" action="/denials" className="form"><input type="search" name="q" placeholder="e.g. CO-16" aria-label="Search denial codes" style={{ width: "100%" }} /></form>
          <p className="small" style={{ marginBottom: 0 }}><Link className="clear" href="/denials">Browse all denial codes →</Link></p></div>
      </aside>
    </div>
  );
}
