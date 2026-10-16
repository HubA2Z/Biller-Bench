"use client";
import { startTransition, useActionState, useState } from "react";
import { saveDenial, type DenialState } from "@/app/actions/denials";
import { DENIAL_CATEGORIES, GROUP_CODES, defaultTitle } from "@/lib/denials";
import { renderMarkdown } from "@/lib/markdown";
import { PhiNotice } from "./PhiNotice";
import { handleMarkdownPaste } from "@/lib/paste";

export type DenialDraft = { id?: string; code: string; groupCode: string; category: string; title: string; quickAnswer: string; body: string; related: string[]; status?: string };

const TEMPLATE = "## What it means\n\n\n\n## Common causes\n\n1. \n2. \n3. \n\n## How to fix it\n\n1. \n2. \n3. \n\n## Medicare vs. commercial payers\n\n| | Medicare | Most commercial payers |\n|---|---|---|\n| | | |\n\n## Prevent it next time\n\n- \n- \n\n## Sources\n\n- [Source](https://)";

export function DenialForm({ initial }: { initial?: DenialDraft }) {
  const [state, action, pending] = useActionState<DenialState, FormData>(saveDenial, undefined);
  const [code, setCode] = useState(initial?.code ?? "");
  const [group, setGroup] = useState(initial?.groupCode ?? "CO");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [quick, setQuick] = useState(initial?.quickAnswer ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const published = initial?.status === "PUBLISHED";

  return (
    <form className="card" noValidate onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      fd.set("intent", submitter?.value === "publish" ? "publish" : "draft");
      fd.set("body", body);
      startTransition(() => action(fd));
    }}>
      <div className="form">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <div className="row2">
          <div className="field"><label htmlFor="code">Reason code (CARC) <span className="req">*</span></label>
            <input type="text" id="code" name="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="97" /></div>
          <div className="field"><label htmlFor="groupCode">Group shown in the page name</label>
            <select id="groupCode" name="groupCode" value={group} onChange={(e) => setGroup(e.target.value)}>{Object.keys(GROUP_CODES).map((g) => <option key={g}>{g}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="category">Category <span className="req">*</span></label>
          <select id="category" name="category" defaultValue={initial?.category ?? ""}><option value="" disabled>Choose…</option>
            {Object.entries(DENIAL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div className="field"><label htmlFor="title">Page title <span className="req">*</span></label>
          <input type="text" id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          {!title && code && <button type="button" className="clear" onClick={() => setTitle(defaultTitle(group, code))}>Use “{defaultTitle(group, code)}”</button>}</div>
        <div className="field"><label htmlFor="quickAnswer">Quick answer <span className="req">*</span></label>
          <textarea id="quickAnswer" name="quickAnswer" value={quick} onChange={(e) => setQuick(e.target.value)} maxLength={600} style={{ minHeight: 80 }} />
          <span className="hint">2–3 sentences. Shown at the top of the page and in Google. {quick.length}/600</span></div>
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <label htmlFor="body" style={{ fontWeight: 600, fontSize: 14 }}>Page body <span className="req">*</span></label>
            {!body.trim() && <button type="button" className="clear" onClick={() => setBody(TEMPLATE)}>Start from the template</button>}
          </div>
          <div className="tabs"><button type="button" aria-pressed={tab === "write"} onClick={() => setTab("write")}>Write</button><button type="button" aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Preview</button></div>
          {tab === "write"
            ? <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} onPaste={(e) => handleMarkdownPaste(e, body, setBody)} style={{ minHeight: 420, fontFamily: "var(--f-mono)", fontSize: 13.5 }} />
            : <div className="preview article"><h1 style={{ fontSize: 24 }}>{title || "Untitled"}</h1><div className="quick-answer"><p>{quick}</p></div><div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(body || "") }} /></div>}
          <PhiNotice text={`${title}\n${quick}\n${body}`} />
        </div>
        <div className="field"><label htmlFor="related">Related codes</label>
          <input type="text" id="related" name="related" defaultValue={initial?.related.join(", ")} placeholder="4, 236, B15" />
          <span className="hint">Only codes with a published page are linked.</span></div>
        {state?.errors && <ul className="errors" role="alert">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <p className="small muted" style={{ margin: 0 }}>Publishing shows you as the reviewer, with today’s date. Check every fact against the official source before publishing.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="submit" className="btn" value="publish" disabled={pending}>{pending ? "Saving…" : published ? "Update and mark reviewed" : "Publish"}</button>
          <button type="submit" className="btn ghost" value="draft" disabled={pending}>{published ? "Unpublish and save as draft" : "Save draft"}</button>
        </div>
      </div>
    </form>
  );
}
