import type { Metadata } from "next";
import Link from "next/link";
import { DENIAL_CATEGORIES, GROUP_CODES, denialPath, type DenialCategory } from "@/lib/denials";
import { listPublishedDenials } from "@/lib/denial-queries";
import { appUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Denial Code Library: CARC Meanings and How to Fix Them",
  description: "Plain-English meanings of claim denial codes (CO, PR, OA, PI) with common causes, fix steps and Medicare vs. commercial payer differences, reviewed by certified billers.",
  alternates: { canonical: "/denials" },
};

/** First sentence of the quick answer, without repeating the code ("CO-97 means the payer…" → "The payer…"). */
const teaser = (s: string) => {
  const first = s.split(/(?<=\.)\s/)[0].replace(/^[A-Z]{2}-\w+ means (that )?/, "");
  return first.charAt(0).toUpperCase() + first.slice(1);
};

export default async function Denials({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = await listPublishedDenials(q);
  const byCat = (Object.keys(DENIAL_CATEGORIES) as DenialCategory[])
    .map((k) => ({ k, items: rows.filter((r) => r.category === k) })).filter((g) => g.items.length);
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${appUrl()}/` }, { "@type": "ListItem", position: 2, name: "Denial Code Library", item: `${appUrl()}/denials` }] };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="pagehead">
        <span className="eyebrow">Denial Code Library</span>
        <h1>Claim denial codes, explained by certified billers</h1>
        <p className="muted" style={{ maxWidth: "68ch", margin: 0 }}>Look up any denial on your remittance (ERA/EOB). Each page explains what the code means, why it happens, and the steps to fix and prevent it.</p>
      </div>
      <form className="searchbar" method="get" action="/denials" style={{ marginBottom: 18 }}>
        <input type="search" name="q" defaultValue={q} placeholder="Type a code like CO-97 or a word like “timely filing”" aria-label="Search denial codes" />
        <button className="btn" type="submit">Search</button>
      </form>

      {q && <p className="muted small">{rows.length} result{rows.length === 1 ? "" : "s"} for “{q}”. <Link className="clear" href="/denials">Show all</Link></p>}
      {!rows.length && <div className="card"><p style={{ margin: 0 }}>{q ? "No denial code page matches that yet." : "Denial code pages are coming soon."} <Link className="clear" href="/ask">Ask our billers about it, free →</Link></p></div>}

      {byCat.map(({ k, items }) => (
        <section key={k} className="section" style={{ marginTop: 22 }}>
          <h2 style={{ marginBottom: 4 }}>{DENIAL_CATEGORIES[k].label}</h2>
          <p className="muted small" style={{ margin: "0 0 10px" }}>{DENIAL_CATEGORIES[k].desc}</p>
          <div className="denial-grid">
            {items.map((d) => (
              <Link key={d.code} href={denialPath(d)} className="denial-card">
                <span className="denial-code">{d.groupCode}-{d.code}</span>
                <span className="small">{teaser(d.quickAnswer)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="section card">
        <h2 style={{ fontSize: 18 }}>What the letters before the number mean</h2>
        <dl className="contact-list" style={{ marginTop: 8 }}>
          {Object.entries(GROUP_CODES).map(([g, d]) => <span key={g} style={{ display: "contents" }}><dt><strong>{g}</strong></dt><dd>{d}</dd></span>)}
        </dl>
        <p className="small muted" style={{ margin: 0 }}>The number is the claim adjustment reason code (CARC). The same number can appear with different letters, depending on who is responsible for the amount.</p>
      </section>
    </>
  );
}
