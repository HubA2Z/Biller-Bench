import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { CONTACT_TOPICS, company, socialLinks } from "@/lib/company";
import { ContactForm } from "@/components/InquiryForms";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Contact the BillerBench team about the site, billing services, partnerships or your account.",
  alternates: { canonical: "/contact" },
};

export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const c = company();
  const social = socialLinks();
  const user = await getCurrentUser();
  const provider = user && !isStaff(user) ? user : null;
  const pickedTopic = (CONTACT_TOPICS as readonly string[]).includes(topic ?? "") ? topic : undefined;
  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">Contact us</span>
        <h1>Talk to the BillerBench team</h1>
        <p className="muted" style={{ maxWidth: "66ch", margin: 0 }}>Send us a message and we’ll reply by email within one business day.</p>
      </div>

      <div className="contact-grid">
        <div className="card"><ContactForm key={pickedTopic} topic={pickedTopic} name={provider?.name ?? ""} email={provider?.email ?? ""} organization={provider?.practiceName ?? ""} /></div>
        <aside className="contact-side">
          <div className="card">
            <h3>Have a billing question?</h3>
            <p className="small muted">Ask it on BillerBench instead. It’s free, and a certified biller answers within one business day.</p>
            <Link className="btn sm" href="/ask">Ask a question</Link>
          </div>
          <div className="card">
            <h3>Want us to handle billing?</h3>
            <p className="small muted">Request a quote for billing, eligibility, prior authorization, appeals and more.</p>
            <Link className="btn sm ghost" href="/services#request">Request a quote</Link>
          </div>
          <div className="card">
            <h3>Reach us</h3>
            <dl className="contact-list">
              {c.email && <><dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></>}
              {c.phone && <><dt>Phone</dt><dd><a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a></dd></>}
              {c.address && <><dt>Address</dt><dd style={{ whiteSpace: "pre-line" }}>{c.address}</dd></>}
              <dt>Hours</dt><dd>{c.hours}</dd>
              {social.map((s) => <span key={s.label} style={{ display: "contents" }}><dt>{s.label}</dt><dd><a href={s.url} target="_blank" rel="noopener noreferrer me">{s.url.replace(/^https:\/\/(www\.)?/i, "").replace(/\/$/, "")}</a></dd></span>)}
            </dl>
            <p className="small muted" style={{ marginBottom: 0 }}>Never send patient information by email or this form.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
