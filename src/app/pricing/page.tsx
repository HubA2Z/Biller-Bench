import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { PLANS, SERVICES, URGENT, dollars } from "@/lib/plans";
import { startPlanCheckout } from "@/app/actions/billing";
import { visibleTo } from "@/lib/queries";
import { LeadForm } from "@/components/LeadForm";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = {
  title: "Pricing & services",
  description: "Free public answers from certified medical billers. Paid plans for private answers in 4 business hours, plus appeals, denial audits and full billing service.",
};

const TAGS: Record<string, string> = { FREE: "Start here", BASIC: "Small practice", PRO: "Most practices pick this", DEDICATED: "Multi-provider" };

export default async function Pricing({ searchParams }: { searchParams: Promise<{ service?: string; question?: string; payment?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const current = user && !isStaff(user) ? user.plan : null;
  const [q] = sp.question
    ? await db.select({ id: schema.questions.id, title: schema.questions.title }).from(schema.questions).where(and(eq(schema.questions.id, sp.question), visibleTo(user))).limit(1)
    : [];

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">Pricing</span>
        <h1>Answers are free. Speed and privacy are paid.</h1>
        <p className="muted" style={{ maxWidth: "64ch", margin: 0 }}>Every question is answered by a certified biller on our team. Paid plans get private answers, faster.</p>
      </div>
      {sp.payment === "cancelled" && <div className="phi bad" style={{ marginBottom: 14 }}>Checkout was cancelled. Nothing was charged.</div>}
      <div className="plans">
        {Object.values(PLANS).map((p) => (
          <div key={p.key} className={`plan ${p.key === "PRO" ? "feat" : ""}`}>
            <span className="tag" style={p.key === "PRO" ? undefined : { color: "var(--ink-3)" }}>{TAGS[p.key]}</span>
            <h3 style={{ fontSize: 16 }}>{p.name}</h3>
            <div className="price">{p.priceCents ? <>{p.key === "DEDICATED" && <small>from </small>}{dollars(p.priceCents)}<small> / month</small></> : "$0"}</div>
            <div className="small"><strong>Answer time:</strong> {p.slaLabel}</div>
            <ul>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
            {current === p.key ? <button className="btn ghost sm" disabled>Your current plan</button>
              : p.key === "FREE" ? (user ? null : <Link className="btn ghost sm" href="/signup">Join free</Link>)
              : (
                <form action={startPlanCheckout}><input type="hidden" name="plan" value={p.key} />
                  <SubmitButton className={`btn sm ${p.key === "PRO" ? "" : "ghost"}`} pendingText="Opening checkout…" disabled={isStaff(user)}>{current && current !== "FREE" ? `Switch to ${p.name}` : `Choose ${p.name}`}</SubmitButton></form>
              )}
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>No plan? Any single question can be answered privately within {URGENT.slaLabel} for <strong>{dollars(URGENT.priceCents)}</strong>.</p>

      <div className="section">
        <h2>Done-for-you services</h2>
        <p className="muted small" style={{ margin: "0 0 12px" }}>When you’d rather we fix it than explain it.</p>
        <div className="qlist">
          {SERVICES.map((s) => (
            <div key={s.id} className="svc"><div style={{ minWidth: 0 }}><strong>{s.name}</strong><div className="muted small">{s.desc}</div></div>
              <span className="p">{s.price}</span><Link className="btn sm ghost" href={`/pricing?service=${s.id}#request`}>Request</Link></div>
          ))}
        </div>
      </div>

      <div className="section" id="request">
        <h2>Request a service</h2>
        <div className="card" style={{ maxWidth: 720 }}>
          <LeadForm key={`${sp.service}-${q?.id}`} service={sp.service} questionId={q?.id} questionTitle={q?.title}
            practiceName={user?.practiceName ?? ""} contactName={user && !isStaff(user) ? user.name : ""} email={user && !isStaff(user) ? user.email : ""} />
        </div>
      </div>
    </>
  );
}
