import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { ANSWER_TIME, SERVICES } from "@/lib/plans";
import { visibleTo } from "@/lib/queries";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "Medical Billing Services for Practices",
  description: "Full-service medical billing, eligibility checks, prior authorization, appeals, denial audits, AR recovery and credentialing by certified billers. Request a quote.",
  alternates: { canonical: "/services" },
};

export default async function Services({ searchParams }: { searchParams: Promise<{ service?: string; question?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const [q] = sp.question
    ? await db.select({ id: schema.questions.id, title: schema.questions.title }).from(schema.questions)
        .where(and(eq(schema.questions.id, sp.question), visibleTo(user))).limit(1)
    : [];
  const service = SERVICES.some((s) => s.id === sp.service) ? sp.service : undefined;
  const provider = user && !isStaff(user) ? user : null;

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">Billing services</span>
        <h1>Let our certified billers take billing off your plate</h1>
        <p className="muted" style={{ maxWidth: "66ch", margin: 0 }}>
          Asking questions on BillerBench is free for every provider. When you’d rather we handle the work, we offer these services. Tell us what you need and we’ll send a quote within one business day.
        </p>
      </div>

      <div className="banner" style={{ marginBottom: 20 }}>
        <span><strong>Free for providers:</strong></span>
        <span className="muted">unlimited billing questions, public or private, answered within {ANSWER_TIME.label}.</span>
        <Link className="clear" href="/ask">Ask a question →</Link>
      </div>

      <div className="plans services-grid">
        {SERVICES.map((s) => (
          <div key={s.id} id={s.id} className={`plan ${s.id === "rcm" ? "feat" : ""}`}>
            {s.id === "rcm" && <span className="tag">Most practices start here</span>}
            <h3 style={{ fontSize: 16 }}>{s.name}</h3>
            <p className="small muted" style={{ margin: 0 }}>{s.desc}</p>
            <ul>{s.points.map((x) => <li key={x}>{x}</li>)}</ul>
            <Link className={`btn sm ${s.id === "rcm" ? "" : "ghost"}`} href={`/services?service=${s.id}#request`}>Request a quote</Link>
          </div>
        ))}
      </div>

      <section className="section" id="request">
        <h2>Request a quote</h2>
        <p className="muted small" style={{ margin: "0 0 12px" }}>No commitment. Don’t include patient details; we’ll collect claim information securely once we start working together.</p>
        <div className="card" style={{ maxWidth: 720 }}>
          <LeadForm key={`${service}-${q?.id}`} service={service} questionId={q?.id} questionTitle={q?.title}
            practiceName={provider?.practiceName ?? ""} contactName={provider?.name ?? ""} email={provider?.email ?? ""} />
        </div>
      </section>
    </>
  );
}
