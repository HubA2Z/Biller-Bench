import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DENIAL_CATEGORIES, carcLabel, categoryPath, denialPath, denialTeaser, type DenialCategory } from "@/lib/denials";
import { listPublishedDenials } from "@/lib/denial-queries";
import { appUrl } from "@/lib/site";

const isCat = (c: string): c is DenialCategory => c in DENIAL_CATEGORIES;

export async function generateMetadata({ params }: { params: Promise<{ cat: string }> }): Promise<Metadata> {
  const { cat } = await params;
  if (!isCat(cat)) return { title: "Not found", robots: { index: false } };
  const c = DENIAL_CATEGORIES[cat];
  return {
    title: `${c.label} denial codes: descriptions and how to fix them`,
    description: `${c.desc} Every ${c.label.toLowerCase()} denial code with its description, causes and fix steps, reviewed by certified billers.`,
    alternates: { canonical: categoryPath(cat) },
  };
}

export default async function DenialCategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  if (!isCat(cat)) notFound();
  const c = DENIAL_CATEGORIES[cat];
  const rows = (await listPublishedDenials()).filter((d) => d.category === cat);
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Denial Code Library", item: `${appUrl()}/denials` },
    { "@type": "ListItem", position: 2, name: c.label, item: `${appUrl()}${categoryPath(cat)}` }] };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, "\\u003c") }} />
      <div className="pagehead">
        <div className="crumbs small" role="navigation" aria-label="Breadcrumb"><Link href="/denials">Denial Code Library</Link> › <span>{c.label}</span></div>
        <h1>{c.label} denial codes</h1>
        <p className="muted" style={{ maxWidth: "68ch", margin: 0 }}>{c.desc} Open a code for its description, common causes and the steps to fix it.</p>
      </div>
      {rows.length ? (
        <div className="denial-grid">
          {rows.map((d) => (
            <Link key={d.code} href={denialPath(d)} className="denial-card">
              <span className="denial-code">{d.groupCode}-{d.code}</span>
              <strong className="small" style={{ color: "var(--ink)" }}>{carcLabel(d.code)}</strong>
              <span className="small">{denialTeaser(d.quickAnswer)}</span>
            </Link>
          ))}
        </div>
      ) : <div className="card"><p style={{ margin: 0 }}>Pages for this category are coming soon.</p></div>}
      <section className="section">
        <h2 style={{ fontSize: 18 }}>Other categories</h2>
        <div className="chips">{(Object.keys(DENIAL_CATEGORIES) as DenialCategory[]).filter((k) => k !== cat).map((k) => <Link key={k} className="chip spec" href={categoryPath(k)} style={{ textDecoration: "none" }}>{DENIAL_CATEGORIES[k].label}</Link>)}</div>
      </section>
      <div className="offer">
        <div><span className="eyebrow">Can’t find your code?</span><h3>Ask a certified biller, free</h3><p>Our team answers claim and denial questions within 1 business day.</p><Link className="btn sm" href="/contact?topic=A%20question%20about%20BillerBench">Ask us</Link></div>
        <div><span className="eyebrow">For practices</span><h3>Free denial review</h3><p>Send your most frequent denial codes and we’ll show you what’s causing them.</p><Link className="btn sm ghost" href="/services?service=audit#request">Get a free review</Link></div>
      </div>
    </>
  );
}
