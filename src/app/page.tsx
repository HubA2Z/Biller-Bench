import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { ANSWER_TIME } from "@/lib/plans";
import { TAGLINE } from "@/lib/company";
import { POPULAR_DENIALS } from "@/lib/carc-labels";
import { DENIAL_CATEGORIES, carcLabel, categoryPath, denialPath, type DenialCategory } from "@/lib/denials";
import { listPublishedDenials } from "@/lib/denial-queries";
import { ARTICLE_KINDS, articlePath } from "@/lib/articles";
import { questionPath } from "@/lib/paths";
import { timeAgo } from "@/lib/sla";

/** The answered-questions block appears once there's enough to show. */
const SHOW_QUESTIONS_AT = 10;

export default async function Home() {
  const user = await getCurrentUser();
  const Q = schema.questions, A = schema.articles;
  const publicAnswered = and(eq(Q.isPrivate, false), eq(Q.draft, false), eq(Q.removed, false), eq(Q.hidden, false), inArray(Q.status, ["ANSWERED", "SOLVED"]));
  const [denials, latest, recentQs, [{ answered }]] = await Promise.all([
    listPublishedDenials(),
    db.select().from(A).where(eq(A.status, "PUBLISHED")).orderBy(desc(A.publishedAt)).limit(4),
    db.select().from(Q).where(publicAnswered).orderBy(desc(Q.createdAt)).limit(5),
    db.select({ answered: count() }).from(Q).where(publicAnswered),
  ]);
  const popular = POPULAR_DENIALS.map((c) => denials.find((d) => d.code === c)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const cats = (Object.keys(DENIAL_CATEGORIES) as DenialCategory[]).map((k) => ({ k, n: denials.filter((d) => d.category === k).length })).filter((c) => c.n > 0);

  return (
    <>
      <section className="home-hero">
        <span className="eyebrow">Free for practices and billers</span>
        <h1>{TAGLINE}</h1>
        <p>Look up any claim denial code, read the fix, or ask our certified billers. Answers within {ANSWER_TIME.label}, no account needed.</p>
        <form className="searchbar home-search" method="get" action="/denials">
          <input type="search" name="q" placeholder="Look up a denial code, e.g. CO-97, or a word like “timely filing”" aria-label="Search denial codes" />
          <button className="btn" type="submit">Search</button>
        </form>
        <div className="cta">
          <Link className="btn ghost" href="/ask">Ask a billing question</Link>
          {!isStaff(user) && <Link className="clear" href="/services?service=audit#request">Free denial review for your practice →</Link>}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="section">
          <div className="sechead"><h2>Most searched denial codes</h2><Link className="clear" href="/denials">All {denials.length} codes →</Link></div>
          <div className="denial-grid">
            {popular.slice(0, 8).map((d) => (
              <Link key={d.code} href={denialPath(d)} className="denial-card">
                <span className="denial-code">{d.groupCode}-{d.code}</span>
                <strong className="small" style={{ color: "var(--ink)" }}>{carcLabel(d.code)}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cats.length > 0 && (
        <section className="section">
          <div className="sechead"><h2>Browse denials by category</h2></div>
          <div className="cat-grid">
            {cats.map(({ k, n }) => (
              <Link key={k} href={categoryPath(k)} className="cat-card">
                <strong>{DENIAL_CATEGORIES[k].label}</strong>
                <span className="small muted">{n} code{n === 1 ? "" : "s"} · {DENIAL_CATEGORIES[k].desc}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="home-cols">
        <section className="section">
          <div className="sechead"><h2>Latest coding and payer updates</h2><Link className="clear" href="/updates">All updates →</Link></div>
          {latest.length ? (
            <div className="card alist" style={{ padding: 0 }}>
              {latest.map((a) => (
                <Link key={a.id} href={articlePath(a)} className="arow">
                  <span className={`kind ${a.kind}`}>{ARTICLE_KINDS[a.kind].label}</span>
                  <h3>{a.title}</h3>
                  <p>{a.summary}</p>
                </Link>
              ))}
            </div>
          ) : <div className="card"><p className="muted" style={{ margin: 0 }}>Updates are coming soon.</p></div>}
        </section>

        <section className="section">
          {answered >= SHOW_QUESTIONS_AT ? (
            <>
              <div className="sechead"><h2>Recently answered</h2><Link className="clear" href="/questions">All {answered} questions →</Link></div>
              <div className="card mini" style={{ padding: 16 }}>
                {recentQs.map((q) => <Link key={q.id} href={questionPath(q)}>{q.title} <span className="muted small">· {timeAgo(q.createdAt)}</span></Link>)}
              </div>
            </>
          ) : <div className="sechead"><h2>Ask our billers</h2></div>}
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 6px" }}>Stuck on a claim?</h3>
            <p className="small muted" style={{ margin: "0 0 12px" }}>Tell us the codes, payer and denial (no patient details). A certified biller replies within {ANSWER_TIME.label}. Free, no account needed.</p>
            <Link className="btn sm" href="/ask">Ask a question</Link>
          </div>
        </section>
      </div>

      {!isStaff(user) && (
        <div className="offer">
          <div><span className="eyebrow">For practices</span><h3>Free denial review</h3><p>Send your most frequent denial codes and we’ll show you what’s causing them and how to stop them.</p><Link className="btn sm" href="/services?service=audit#request">Get a free review</Link></div>
          <div><span className="eyebrow">Want it handled?</span><h3>Billing services</h3><p>Full billing, eligibility, prior authorization, appeals, AR recovery and credentialing by certified billers.</p><Link className="btn sm ghost" href="/services">See services</Link></div>
        </div>
      )}
    </>
  );
}
