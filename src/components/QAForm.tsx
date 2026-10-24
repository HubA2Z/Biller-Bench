"use client";
import { startTransition, useActionState, useState } from "react";
import { saveQA, type QAState } from "@/app/actions/qa";
import { PAYER_GROUPS, SPECIALTIES, STATES } from "@/lib/taxonomy";
import { renderMarkdown } from "@/lib/markdown";
import { handleMarkdownPaste } from "@/lib/paste";
import { PhiNotice } from "./PhiNotice";

export type QADraft = {
  id?: string; inquiryId?: string; source: "reader" | "team"; title: string; body: string; answer: string;
  codes: string; payerGroup: string; payerName: string; state: string; specialty: string; draft?: boolean;
};

export function QAForm({ initial, original }: { initial: QADraft; original?: string }) {
  const [state, action, pending] = useActionState<QAState, FormData>(saveQA, undefined);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [answer, setAnswer] = useState(initial.answer);
  const [group, setGroup] = useState(initial.payerGroup || "General");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const names = PAYER_GROUPS[group] ?? [];

  return (
    <form className="card" noValidate onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      fd.set("intent", submitter?.value === "publish" ? "publish" : "draft");
      fd.set("body", body); fd.set("answer", answer);
      startTransition(() => action(fd));
    }}>
      <div className="form">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        {initial.inquiryId && <input type="hidden" name="inquiryId" value={initial.inquiryId} />}
        <input type="hidden" name="source" value={initial.source} />
        {original && (
          <div className="banner" style={{ display: "block" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Original message (private, never published)</div>
            <div className="small" style={{ whiteSpace: "pre-line" }}>{original}</div>
          </div>
        )}
        <p className="small muted" style={{ margin: 0 }}>Shown as asked by <strong>{initial.source === "reader" ? "a BillerBench reader" : "the BillerBench team"}</strong>. Rewrite it as a general question: remove names, practice details, dates and anything that could identify a patient.</p>
        <div className="field"><label htmlFor="qa-title">Question title <span className="req">*</span></label>
          <input type="text" id="qa-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Why did Medicare deny 99214 with CO-97 when billed with 20610?" /></div>
        <div className="field"><label htmlFor="qa-body">Question <span className="req">*</span></label>
          <textarea id="qa-body" value={body} onChange={(e) => setBody(e.target.value)} onPaste={(e) => handleMarkdownPaste(e, body, setBody)} style={{ minHeight: 120 }} /></div>
        <div className="row2">
          <div className="field"><label htmlFor="qa-codes">Codes <span className="req">*</span></label>
            <input type="text" id="qa-codes" name="codes" defaultValue={initial.codes} placeholder="99214, 20610" /></div>
          <div className="field"><label htmlFor="qa-spec">Specialty <span className="req">*</span></label>
            <select id="qa-spec" name="specialty" defaultValue={initial.specialty || "Primary Care"}>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="row2">
          <div className="field"><label htmlFor="qa-pg">Payer type <span className="req">*</span></label>
            <select id="qa-pg" name="payerGroup" value={group} onChange={(e) => setGroup(e.target.value)}>{Object.keys(PAYER_GROUPS).map((g) => <option key={g}>{g}</option>)}</select></div>
          <div className="field"><label htmlFor="qa-pn">Payer <span className="req">*</span></label>
            <select key={group} id="qa-pn" name="payerName" defaultValue={names.includes(initial.payerName) ? initial.payerName : names[0]}>{names.map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="qa-state">State <span className="req">*</span></label>
          <select id="qa-state" name="state" defaultValue={initial.state || "US"}><option value="US">All states</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field">
          <label htmlFor="qa-answer" style={{ fontWeight: 600, fontSize: 14 }}>Expert answer <span className="req">*</span></label>
          <div className="tabs"><button type="button" aria-pressed={tab === "write"} onClick={() => setTab("write")}>Write</button><button type="button" aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Preview</button></div>
          {tab === "write"
            ? <textarea id="qa-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} onPaste={(e) => handleMarkdownPaste(e, answer, setAnswer)} style={{ minHeight: 260, fontFamily: "var(--f-mono)", fontSize: 13.5 }} placeholder={"Short answer first, then numbered steps.\n\n## Why it happens\n\n## How to fix it\n\n1. ...\n\n## Source\n\n- [CMS](https://www.cms.gov/)"} />
            : <div className="preview article"><h1 style={{ fontSize: 22 }}>{title || "Untitled"}</h1><div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} /><hr /><div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} /></div>}
          <span className="hint">The answer is shown under your name and credentials.</span>
          <PhiNotice text={`${title}\n${body}\n${answer}`} />
        </div>
        <label className="ack"><input type="checkbox" name="anonymized" /><span>I removed names, practice details and anything that could identify a patient.</span></label>
        {state?.errors && <ul className="errors" role="alert">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="submit" className="btn" value="publish" disabled={pending}>{pending ? "Saving…" : "Publish Q&A"}</button>
          <button type="submit" className="btn ghost" value="draft" disabled={pending}>Save as draft</button>
        </div>
      </div>
    </form>
  );
}
