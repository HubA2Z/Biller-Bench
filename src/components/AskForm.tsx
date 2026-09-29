"use client";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { createQuestion, type AskState } from "@/app/actions/questions";
import { classifyCode, parseCodes } from "@/lib/codes";
import { EHR_SYSTEMS, MODIFIERS, PAYER_GROUPS, SPECIALTIES, STATES } from "@/lib/taxonomy";
import { PHI_RULES } from "@/lib/phi";
import { URGENT, dollars } from "@/lib/plans";
import { PhiNotice } from "./PhiNotice";

type Props = {
  plan: { key: string; name: string; quota: number; slaLabel: string };
  planLeft: number;
  defaults: { state: string; specialty: string };
};

export function AskForm({ plan, planLeft, defaults }: Props) {
  const [state, action, pending] = useActionState<AskState, FormData>(createQuestion, undefined);
  const [tier, setTier] = useState(planLeft > 0 ? "PLAN" : "FREE");
  const [publish, setPublish] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [codesText, setCodesText] = useState("");
  const [group, setGroup] = useState("Medicare");
  const [similar, setSimilar] = useState<{ title: string; href: string }[]>([]);
  const codes = useMemo(() => parseCodes(codesText), [codesText]);

  // "Already answered?" suggestions while typing the title.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (title.trim().length < 12) return setSimilar([]);
      const res = await fetch(`/api/similar?title=${encodeURIComponent(title)}&codes=${encodeURIComponent(codes.join(","))}`);
      if (res.ok) setSimilar(await res.json());
    }, 350);
    return () => clearTimeout(t);
  }, [title, codes]);

  const payerLabel = group === "Medicare" ? "MAC jurisdiction" : group === "Commercial" ? "Payer" : group === "TRICARE" ? "Region" : "State";

  return (
    <div className="grid askgrid">
      <form className="card" noValidate onSubmit={(e) => {
        // Submit manually so React doesn't reset the form when the server returns errors.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}><div className="form">
        <div className="field"><span className="lbl">How fast do you need an answer? <span className="req">*</span></span>
          <div className="typepick">
            <label><input type="radio" name="tier" value="FREE" checked={tier === "FREE"} onChange={() => setTier("FREE")} /><span><strong>Free · public</strong><br /><span className="muted">Answered within 2–3 business days. The answer becomes a public page.</span></span></label>
            {plan.key !== "FREE" && (
              <label className={planLeft ? "" : "off"}><input type="radio" name="tier" value="PLAN" checked={tier === "PLAN"} disabled={!planLeft} onChange={() => setTier("PLAN")} /><span><strong>{plan.name} · private</strong><br /><span className="muted">{plan.slaLabel}. {planLeft} of {plan.quota} left this month.</span></span></label>
            )}
            <label><input type="radio" name="tier" value="URGENT" checked={tier === "URGENT"} onChange={() => setTier("URGENT")} /><span><strong>Urgent · private · {dollars(URGENT.priceCents)}</strong><br /><span className="muted">Answered within 4 business hours. One-time payment.</span></span></label>
          </div>
          {tier !== "FREE" && (
            <label className="ack" style={{ marginTop: 6 }}><input type="checkbox" name="publish" checked={publish} onChange={(e) => setPublish(e.target.checked)} /><span>Also publish the answer publicly with identifiers removed, so other practices can find it.</span></label>
          )}
        </div>

        <div className="field"><label htmlFor="title">Title <span className="req">*</span></label>
          <input type="text" id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Why is 99214 denying with modifier 25 on Novitas Medicare?" />
          <span className="hint">Lead with the code and the payer.</span>
          {similar.length > 0 && <div className="dupes"><b>Already answered?</b>{similar.map((s) => <a key={s.href} href={s.href} style={{ display: "block", color: "var(--ink)" }}>{s.title}</a>)}</div>}
        </div>

        <div className="field"><label htmlFor="body">Scenario <span className="req">*</span></label>
          <textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was billed, what the payer did (CARC/RARC), and what you've tried." />
          <PhiNotice text={`${title}\n${body}`} />
        </div>

        <div className="field"><label htmlFor="codes">CPT / HCPCS / ICD-10 codes</label>
          <input type="text" id="codes" name="codes" value={codesText} onChange={(e) => setCodesText(e.target.value)} placeholder="99214, 20610, M17.11" />
          <div className="parsed">{codes.map((c) => { const k = classifyCode(c); return <span key={c} className={`chip ${k ? "code" : "bad"}`}>{c}<small>{k ?? "unrecognized"}</small></span>; })}</div>
        </div>

        <div className="field"><span className="lbl">Modifiers</span>
          <div className="modpick">{MODIFIERS.map((m) => <label key={m}><input type="checkbox" name="modifiers" value={m} />-{m}</label>)}</div>
          <span className="hint">Add at least one code or modifier.</span>
        </div>

        <div className="row2">
          <div className="field"><label htmlFor="payerGroup">Payer type <span className="req">*</span></label>
            <select id="payerGroup" name="payerGroup" value={group} onChange={(e) => setGroup(e.target.value)}>{Object.keys(PAYER_GROUPS).map((g) => <option key={g}>{g}</option>)}</select></div>
          <div className="field"><label htmlFor="payerName">{payerLabel} <span className="req">*</span></label>
            <select id="payerName" name="payerName" key={group}>{PAYER_GROUPS[group].map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <div className="row2">
          <div className="field"><label htmlFor="specialty">Specialty <span className="req">*</span></label>
            <select id="specialty" name="specialty" defaultValue={defaults.specialty}><option value="">Choose…</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="state">Practice state <span className="req">*</span></label>
            <select id="state" name="state" defaultValue={defaults.state}><option value="">Choose…</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="ehr">EHR / PM software</label>
            <select id="ehr" name="ehr" defaultValue=""><option value="">Not software-related</option>{EHR_SYSTEMS.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>

        <label className="ack"><input type="checkbox" name="ack" /><span>I confirm this scenario is strictly abstract and contains <strong>no patient-identifiable data</strong>.</span></label>
        {state?.errors && <ul className="errors" role="alert">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div><button type="submit" className="btn" disabled={pending}>{pending ? (tier === "URGENT" ? "Opening checkout…" : "Posting…") : tier === "URGENT" ? `Continue to payment · ${dollars(URGENT.priceCents)}` : "Post question"}</button></div>
      </div></form>

      <aside className="side">
        <div className="eyebrow">No patient information</div>
        <div className="note">Describe the claim scenario, never the patient. Every question is scanned and blocked if it looks like it contains patient identifiers, public or private.</div>
        <div className="eyebrow" style={{ marginTop: 6 }}>Public vs private</div>
        <div className="note">Private questions aren’t published. Only you and our team see them, so your practice’s billing problems stay out of public view.</div>
        <div className="eyebrow" style={{ marginTop: 6 }}>The scanner looks for</div>
        <div className="ruleset" style={{ gridTemplateColumns: "1fr" }}>{PHI_RULES.map((r) => <div key={r.name}><b>{r.name}</b></div>)}</div>
      </aside>
    </div>
  );
}
