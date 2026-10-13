import type { Metadata } from "next";
import Link from "next/link";
import { CAREER_ROLES } from "@/lib/company";
import { ApplicationForm } from "@/components/InquiryForms";

export const metadata: Metadata = {
  title: "Careers: Medical Billing and Coding Jobs",
  description: "Join the BillerBench team: certified medical billers, coders, AR, prior authorization and credentialing specialists. Apply online.",
  alternates: { canonical: "/careers" },
};

export default async function Careers({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const picked = CAREER_ROLES.some((r) => r.id === role) ? role : undefined;
  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">Careers</span>
        <h1>Help practices get paid. Work with our billing team.</h1>
        <p className="muted" style={{ maxWidth: "66ch", margin: 0 }}>
          Our certified billers answer provider questions on BillerBench and work claims for the practices that use our billing services. If you know US medical billing well, we’d like to hear from you.
        </p>
      </div>

      <section className="section" style={{ marginTop: 0 }}>
        <h2>Roles we hire for</h2>
        <p className="muted small" style={{ margin: "0 0 12px" }}>Not every role is open at all times. We review every application and keep it on file for future openings.</p>
        <div className="plans services-grid">
          {CAREER_ROLES.map((r) => (
            <div key={r.id} className="plan">
              <h3 style={{ fontSize: 16 }}>{r.title}</h3>
              <p className="small muted" style={{ margin: 0 }}>{r.desc}</p>
              {r.needs.length > 0 && <ul>{r.needs.map((n) => <li key={n}>{n}</li>)}</ul>}
              <Link className="btn sm ghost" href={`/careers?role=${r.id}#apply`}>Apply</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="apply">
        <h2>Apply</h2>
        <p className="muted small" style={{ margin: "0 0 12px" }}>Share a LinkedIn profile or a link to your resume (Google Drive, Dropbox or similar). Please don’t include any patient information.</p>
        <div className="card" style={{ maxWidth: 720 }}><ApplicationForm key={picked} role={picked} /></div>
      </section>
    </>
  );
}
