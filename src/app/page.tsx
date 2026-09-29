import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listQuestions, planQuestionsUsed, type ListFilters } from "@/lib/queries";
import { PAYER_GROUPS, SPECIALTIES, STATES } from "@/lib/taxonomy";
import { PLANS } from "@/lib/plans";
import { questionPath } from "@/lib/paths";
import { timeAgo } from "@/lib/sla";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { QuestionChips, TierChips, slaText } from "@/components/ui";

type SP = Record<string, string | undefined>;

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const f: ListFilters = {
    q: sp.q, code: sp.code, payer: sp.payer, state: sp.state, specialty: sp.specialty,
    status: (["answered", "open", "mine"].includes(sp.status ?? "") ? sp.status : "all") as ListFilters["status"],
    sort: sp.sort === "votes" ? "votes" : "recent", page: Number(sp.page) || 1,
  };
  const { rows, total, page, pages } = await listQuestions(f, user);
  const used = user?.role === "PROVIDER" && user.plan !== "FREE" ? await planQuestionsUsed(user.id) : 0;

  const link = (patch: SP) => {
    const merged: SP = { ...sp, page: undefined, ...patch };
    const p = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => !!e[1]));
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };
  const statuses: [string, string][] = [["all", "All"], ["answered", "Answered"], ["open", "Waiting"], ...(user?.role === "PROVIDER" ? [["mine", "Mine"] as [string, string]] : [])];
  const active = f.code || f.payer || f.state || f.specialty || f.status !== "all";

  return (
    <div className="grid">
      <aside className="rail">
        <details open>
          <summary className="eyebrow">Filter questions</summary>
          <div className="side" style={{ marginTop: 12 }}>
            <div className="facet"><label>Status</label>
              <div className="seg">{statuses.map(([k, l]) => <Link key={k} href={link({ status: k === "all" ? undefined : k })} aria-pressed={f.status === k}>{l}</Link>)}</div>
            </div>
            <AutoSubmitForm className="side">
              {f.q && <input type="hidden" name="q" value={f.q} />}
              {f.status !== "all" && <input type="hidden" name="status" value={f.status} />}
              <div className="facet"><label htmlFor="fCode">Code or modifier</label><input id="fCode" name="code" placeholder="e.g. 99214 or 25" defaultValue={f.code} /></div>
              <div className="facet"><label htmlFor="fPayer">Payer</label>
                <select id="fPayer" name="payer" defaultValue={f.payer ?? ""}>
                  <option value="">All payers</option>
                  {Object.entries(PAYER_GROUPS).map(([g, names]) => (
                    <optgroup key={g} label={g}>
                      <option value={g}>All {g}</option>
                      {g !== "Medicaid" && g !== "Workers' Comp" && names.map((n) => <option key={n} value={`${g}|${n}`}>{n}</option>)}
                    </optgroup>
                  ))}
                </select></div>
              <div className="facet"><label htmlFor="fState">Practice state</label>
                <select id="fState" name="state" defaultValue={f.state ?? ""}><option value="">All states</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="facet"><label htmlFor="fSpec">Specialty</label>
                <select id="fSpec" name="specialty" defaultValue={f.specialty ?? ""}><option value="">All specialties</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <button className="btn ghost sm" type="submit">Apply filters</button>
            </AutoSubmitForm>
            {active && <Link className="clear" href={f.q ? `/?q=${encodeURIComponent(f.q)}` : "/"}>Clear filters</Link>}
          </div>
        </details>
      </aside>

      <section style={{ minWidth: 0 }}>
        {user?.role === "PROVIDER" && (
          <div className="banner" style={{ marginBottom: 14 }}>
            <span><strong>{PLANS[user.plan].name}</strong> plan</span>
            {user.plan === "FREE"
              ? <><span className="muted">Free questions are public and answered in 2–3 business days.</span><Link className="clear" href="/pricing">Get private answers in 4 hours →</Link></>
              : <span className="quota">{Math.max(0, PLANS[user.plan].quota - used)} of {PLANS[user.plan].quota} private questions left this month · {PLANS[user.plan].slaLabel}</span>}
          </div>
        )}
        <form className="searchbar" method="get">
          <input type="search" name="q" defaultValue={f.q} placeholder="Search denials, codes, payers… try “CO-97” or “G2211”" aria-label="Search questions" />
          {Object.entries(sp).filter(([k, v]) => v && !["q", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <Link className="btn" href="/ask">Ask our billers</Link>
        </form>
        <div className="listhead">
          <span className="muted small"><strong style={{ color: "var(--ink)" }}>{total}</strong> question{total === 1 ? "" : "s"}</span>
          <div className="sort">
            <Link href={link({ sort: undefined })} aria-pressed={f.sort === "recent"}>Newest</Link>
            <Link href={link({ sort: "votes" })} aria-pressed={f.sort === "votes"}>Most helpful</Link>
          </div>
        </div>
        <div className="qlist">
          {rows.length === 0 && <div className="empty">No questions match. <Link className="clear" href="/">Clear filters</Link> or <Link className="clear" href="/ask">ask our team</Link>.</div>}
          {rows.map(({ q, authorName, authorOrg, authorPlan, replies }) => {
            const s = slaText(q);
            const st = q.status === "SOLVED" ? "solved" : q.status === "OPEN" ? "open" : "";
            if (q.hidden) return <div key={q.id} className="qrow" style={{ cursor: "default" }}><div className="stat open"><strong>–</strong>hidden</div><div className="muted small">Your question is hidden while our team checks a PHI report.</div></div>;
            return (
              <Link key={q.id} className="qrow" href={questionPath(q)}>
                <div className={`stat ${st}`}><strong>{replies}</strong>{q.status === "SOLVED" ? "solved" : replies === 1 ? "reply" : "replies"}</div>
                <div style={{ minWidth: 0 }}>
                  <h3>{q.title}</h3>
                  <div className="chips"><TierChips q={q} authorPlan={authorPlan} /><QuestionChips q={q} /></div>
                  <div className="meta"><span className={`sla ${s.cls}`}>{s.text}</span><span>{authorName}{authorOrg ? `, ${authorOrg}` : ""} · {q.state}</span><span>{timeAgo(q.createdAt)}</span></div>
                </div>
              </Link>
            );
          })}
        </div>
        {pages > 1 && (
          <div className="pager">
            {page > 1 && <Link href={link({ page: String(page - 1) })}>← Newer</Link>}
            <span className="muted">Page {page} of {pages}</span>
            {page < pages && <Link href={link({ page: String(page + 1) })}>Older →</Link>}
          </div>
        )}
      </section>
    </div>
  );
}
