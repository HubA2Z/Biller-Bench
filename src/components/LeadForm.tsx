"use client";
import { useActionState } from "react";
import { requestService, type LeadState } from "@/app/actions/leads";
import { SERVICES } from "@/lib/plans";
import { SubmitButton } from "./SubmitButton";

type Props = { service?: string; questionId?: string; questionTitle?: string; practiceName?: string; contactName?: string; email?: string };

export function LeadForm(p: Props) {
  const [state, action] = useActionState<LeadState, FormData>(requestService, undefined);
  if (state?.ok) {
    const name = SERVICES.find((s) => s.id === state.service)?.name.toLowerCase() ?? "this service";
    return <div className="phi ok"><strong>Request received.</strong> A team lead will reply by email within one business day with a quote for {name}.</div>;
  }
  return (
    <form action={action} className="form">
      {p.questionId && <><input type="hidden" name="questionId" value={p.questionId} /><div className="banner small">About: <strong>{p.questionTitle}</strong></div></>}
      <div className="row2">
        <div className="field"><label htmlFor="service">Service <span className="req">*</span></label>
          <select id="service" name="service" defaultValue={p.service ?? "audit"}>{SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.price}</option>)}</select></div>
        <div className="field"><label htmlFor="practiceName">Practice name <span className="req">*</span></label><input type="text" id="practiceName" name="practiceName" defaultValue={p.practiceName} required /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="contactName">Your name <span className="req">*</span></label><input type="text" id="contactName" name="contactName" defaultValue={p.contactName} required /></div>
        <div className="field"><label htmlFor="email">Work email <span className="req">*</span></label><input type="email" id="email" name="email" defaultValue={p.email} required /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="claimsPerMonth">Claims per month</label>
          <select id="claimsPerMonth" name="claimsPerMonth" defaultValue=""><option value="">Choose…</option>{["Under 200", "200–400", "400–1,000", "1,000+"].map((v) => <option key={v}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="payers">Main payers</label><input type="text" id="payers" name="payers" placeholder="e.g. Medicare, UHC, Cigna" /></div>
      </div>
      <div className="field"><label htmlFor="note">What’s going on?</label><textarea id="note" name="note" style={{ minHeight: 90 }} placeholder="Denial trends, backlog size, deadlines. Don't include patient details here." /></div>
      {state?.error && <ul className="errors" role="alert"><li>{state.error}</li></ul>}
      <div><SubmitButton pendingText="Sending…">Send request</SubmitButton></div>
    </form>
  );
}
