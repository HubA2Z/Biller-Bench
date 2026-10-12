"use client";
import { startTransition, useActionState, useState } from "react";
import { submitApplication, submitContact, type InquiryState } from "@/app/actions/inquiries";
import { CAREER_ROLES, CONTACT_TOPICS } from "@/lib/company";
import { PhiNotice } from "./PhiNotice";

/** Keeps what people typed when the server returns an error (a plain form action would clear it). */
const submitWith = (action: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
};

/** Hidden from people; bots fill it in and their submission is dropped. */
const Trap = () => (
  <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
    <label htmlFor="website">Website</label><input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
  </div>
);

export function ContactForm({ name = "", email = "", organization = "", topic }: { name?: string; email?: string; organization?: string; topic?: string }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitContact, undefined);
  const [message, setMessage] = useState("");
  if (state?.ok) return <div className="phi ok" role="status"><strong>Message sent.</strong> Thanks for reaching out. Someone from our team will reply by email within one business day.</div>;
  return (
    <form className="form" noValidate onSubmit={submitWith(action)} style={{ position: "relative" }}>
      <Trap />
      <div className="row2">
        <div className="field"><label htmlFor="name">Your name <span className="req">*</span></label><input type="text" id="name" name="name" defaultValue={name} autoComplete="name" required /></div>
        <div className="field"><label htmlFor="email">Email <span className="req">*</span></label><input type="email" id="email" name="email" defaultValue={email} autoComplete="email" required /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="organization">Practice or company</label><input type="text" id="organization" name="organization" defaultValue={organization} autoComplete="organization" /></div>
        <div className="field"><label htmlFor="phone">Phone</label><input type="text" id="phone" name="phone" inputMode="tel" autoComplete="tel" /></div>
      </div>
      <div className="field"><label htmlFor="topic">Topic <span className="req">*</span></label>
        <select id="topic" name="topic" defaultValue={topic ?? ""} required><option value="" disabled>Choose…</option>{CONTACT_TOPICS.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="field"><label htmlFor="message">Message <span className="req">*</span></label>
        <textarea id="message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} style={{ minHeight: 130 }} placeholder="How can we help? Please don’t include patient details." required />
        <PhiNotice text={message} /></div>
      {state?.error && <ul className="errors" role="alert"><li>{state.error}</li></ul>}
      <div><button type="submit" className="btn" disabled={pending}>{pending ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}

export function ApplicationForm({ role }: { role?: string }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitApplication, undefined);
  const [message, setMessage] = useState("");
  if (state?.ok) return <div className="phi ok" role="status"><strong>Application received.</strong> Thank you. We review every application and will email you if there’s a fit. We keep applications on file for future openings.</div>;
  return (
    <form className="form" noValidate onSubmit={submitWith(action)} style={{ position: "relative" }}>
      <Trap />
      <div className="row2">
        <div className="field"><label htmlFor="name">Full name <span className="req">*</span></label><input type="text" id="name" name="name" autoComplete="name" required /></div>
        <div className="field"><label htmlFor="email">Email <span className="req">*</span></label><input type="email" id="email" name="email" autoComplete="email" required /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="role">Role <span className="req">*</span></label>
          <select id="role" name="role" defaultValue={role ?? ""} required><option value="" disabled>Choose…</option>{CAREER_ROLES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
        <div className="field"><label htmlFor="phone">Phone</label><input type="text" id="phone" name="phone" inputMode="tel" autoComplete="tel" /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="experience">Credentials and years of experience</label><input type="text" id="experience" name="experience" maxLength={300} placeholder="e.g. CPC, CPB · 5 years" /></div>
        <div className="field"><label htmlFor="link">LinkedIn or resume link</label><input type="text" id="link" name="link" inputMode="url" maxLength={300} placeholder="https://" /></div>
      </div>
      <div className="field"><label htmlFor="message">About you <span className="req">*</span></label>
        <textarea id="message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} style={{ minHeight: 130 }} placeholder="Specialties, payers and software you know, and what kind of work you’re looking for." required />
        <PhiNotice text={message} /></div>
      {state?.error && <ul className="errors" role="alert"><li>{state.error}</li></ul>}
      <div><button type="submit" className="btn" disabled={pending}>{pending ? "Sending…" : "Submit application"}</button></div>
    </form>
  );
}
