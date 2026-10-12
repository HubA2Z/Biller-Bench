import type { Metadata } from "next";
import Link from "next/link";
import { MISSION } from "@/lib/company";
import { ANSWER_TIME, SERVICES } from "@/lib/plans";

export const metadata: Metadata = {
  title: "About us",
  description: "BillerBench is a free medical billing Q&A for US providers, answered by our own certified billers. Learn about our mission and how we work.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { t: "Free for providers", d: `Every provider can ask unlimited billing questions, public or private, and get an answer within ${ANSWER_TIME.label}.` },
  { t: "Answered by our own billers", d: "Answers come only from certified billers and coders on our team, not anonymous strangers. Every answer cites the payer or CMS policy behind it." },
  { t: "No patient information, ever", d: "BillerBench never stores PHI. Every question and reply is checked for patient identifiers before it can be posted." },
  { t: "Plain, practical answers", d: "We tell you what to fix on the claim and why, so the same denial doesn’t come back." },
];

const STEPS = [
  { t: "Ask", d: "Describe the denial or coding question with the codes, modifiers and payer. No patient details." },
  { t: "We answer", d: `A certified biller on our team answers within ${ANSWER_TIME.label}, with the policy source.` },
  { t: "Fix and resubmit", d: "Mark the answer as the solution, or ask a follow-up. Public answers help the next practice with the same problem." },
];

export default function About() {
  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">About us</span>
        <h1>Billing answers from people who bill claims every day</h1>
        <p className="muted" style={{ maxWidth: "66ch", margin: 0 }}>
          BillerBench is a medical billing Q&amp;A for US physician practices. Providers ask about claim denials, CPT and ICD-10 coding, modifiers and payer rules, and our in-house team of certified billers answers.
        </p>
      </div>

      <section className="mission">
        <span className="eyebrow">Our mission</span>
        <p>{MISSION}</p>
      </section>

      <section className="section">
        <h2>What we stand for</h2>
        <div className="offer" style={{ marginTop: 0 }}>
          {VALUES.map((v) => <div key={v.t}><h3>{v.t}</h3><p>{v.d}</p></div>)}
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map((s) => <li key={s.t}><strong>{s.t}</strong><span>{s.d}</span></li>)}
        </ol>
      </section>

      <section className="section">
        <h2>How we keep it free</h2>
        <p style={{ maxWidth: "66ch" }}>
          The Q&amp;A is free and stays free. Our team also offers paid billing services for practices that want us to do the work: {SERVICES.map((s) => s.name.replace(/^\w/, (c) => c.toLowerCase())).join(", ")}. You never need to buy a service to get an answer.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="btn" href="/ask">Ask a question</Link>
          <Link className="btn ghost" href="/services">See billing services</Link>
          <Link className="btn ghost" href="/experts">Meet our billers</Link>
        </div>
      </section>

      <section className="section">
        <div className="offer" style={{ marginTop: 0 }}>
          <div><span className="eyebrow">Work with us</span><h3>Are you a certified biller or coder?</h3><p>We’re building a team of experienced billers, coders and AR specialists.</p><Link className="btn sm ghost" href="/careers">See careers</Link></div>
          <div><span className="eyebrow">Get in touch</span><h3>Questions about BillerBench?</h3><p>Partnerships, account requests or anything else, we reply within one business day.</p><Link className="btn sm ghost" href="/contact">Contact us</Link></div>
        </div>
      </section>
    </>
  );
}
