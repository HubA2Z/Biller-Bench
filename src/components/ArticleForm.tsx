"use client";
import { startTransition, useActionState, useMemo, useRef, useState } from "react";
import { saveArticle, type ArticleState } from "@/app/actions/articles";
import { ARTICLE_KINDS, type ArticleKind } from "@/lib/articles";
import { classifyCode, parseCodes } from "@/lib/codes";
import { renderMarkdown } from "@/lib/markdown";
import { SPECIALTIES } from "@/lib/taxonomy";
import { EXPERT_PAYERS } from "@/lib/team";
import { PhiNotice } from "./PhiNotice";

export type ArticleDraft = {
  id?: string; kind: ArticleKind; status?: "DRAFT" | "PUBLISHED"; title: string; summary: string; body: string;
  codes: string[]; payers: string[]; specialty: string | null; effectiveDate: string; sourceUrl: string | null;
};

const TOOLS: [string, string][] = [
  ["Heading", "\n## Heading\n"], ["Subheading", "\n### Subheading\n"], ["Bold", "**bold**"], ["List", "\n- item\n- item\n"],
  ["Numbered", "\n1. First\n2. Second\n"], ["Code", "`99214`"], ["Quote", "\n> Quoted policy text\n"],
  ["Link", "[link text](https://)"], ["+ CMS source", "[CMS source](https://www.cms.gov/)"],
];

const TEMPLATES: Record<ArticleKind, string> = {
  ARTICLE: "## The problem\n\nWhat practices run into.\n\n## What to do\n\n1. First step\n2. Second step\n\n## Sources\n\n- [Source](https://)",
  CODING_UPDATE: "## What changed\n\nDescribe the new, revised or deleted codes and guidelines.\n\n## Who it affects\n\nSpecialties and payers.\n\n## What billers should do\n\n1. Update the charge master\n2. Update templates and superbills\n\n## Source\n\n- [CMS / AMA announcement](https://)",
  PAYER_UPDATE: "## What changed\n\nThe payer's new rule or policy.\n\n## Effective date and plans\n\nWhich plans and dates it covers.\n\n## What billers should do\n\n1. Step one\n2. Step two\n\n## Source\n\n- [Payer policy bulletin](https://)",
};

export function ArticleForm({ initial }: { initial?: ArticleDraft }) {
  const [state, action, pending] = useActionState<ArticleState, FormData>(saveArticle, undefined);
  const a = initial;
  const [kind, setKind] = useState<ArticleKind>(a?.kind ?? "CODING_UPDATE");
  const [title, setTitle] = useState(a?.title ?? "");
  const [summary, setSummary] = useState(a?.summary ?? "");
  const [body, setBody] = useState(a?.body ?? "");
  const [codesText, setCodesText] = useState(a?.codes.join(", ") ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const ta = useRef<HTMLTextAreaElement>(null);
  const codes = useMemo(() => parseCodes(codesText), [codesText]);
  const published = a?.status === "PUBLISHED";

  const insert = (s: string) => {
    const el = ta.current; if (!el) return;
    const x = el.selectionStart, y = el.selectionEnd;
    setBody(body.slice(0, x) + s + body.slice(y));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = x + s.length; });
  };

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
        {a?.id && <input type="hidden" name="id" value={a.id} />}
        <div className="field"><span className="lbl">Type</span>
          <div className="typepick">
            {(Object.keys(ARTICLE_KINDS) as ArticleKind[]).map((k) => (
              <label key={k}><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                <span><strong>{ARTICLE_KINDS[k].label}</strong><br /><span className="muted">{k === "ARTICLE" ? "Guides and explainers" : k === "CODING_UPDATE" ? "New, revised or deleted codes and rules" : "Changes to a payer’s policy"}</span></span></label>
            ))}
          </div>
        </div>

        <div className="field"><label htmlFor="title">Title <span className="req">*</span></label>
          <input type="text" id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="e.g. 2026 E/M changes: what billers need to update" /></div>

        <div className="field"><label htmlFor="summary">Summary <span className="req">*</span></label>
          <textarea id="summary" name="summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} style={{ minHeight: 70 }} placeholder="One or two sentences. Shows in the updates list and in Google results." />
          <span className="hint">{summary.length}/300</span></div>

        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <label htmlFor="body" style={{ fontWeight: 600, fontSize: 14 }}>Article <span className="req">*</span></label>
            {!body.trim() && <button type="button" className="clear" onClick={() => setBody(TEMPLATES[kind])}>Start from the {ARTICLE_KINDS[kind].label.toLowerCase()} template</button>}
          </div>
          <div className="tabs">
            <button type="button" aria-pressed={tab === "write"} onClick={() => setTab("write")}>Write</button>
            <button type="button" aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Preview</button>
          </div>
          {tab === "write" ? (
            <>
              <div className="toolbar">{TOOLS.map(([l, s]) => <button type="button" key={l} onClick={() => insert(s)}>{l}</button>)}</div>
              <textarea ref={ta} id="body" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 360, fontFamily: "var(--f-mono)", fontSize: 13.5 }}
                placeholder={"## What changed\n\nWrite in plain text. Use ## for headings, - for lists, **bold**, and [links](https://)."} />
            </>
          ) : (
            <div className="preview article"><h1 style={{ fontSize: 26, marginBottom: 10 }}>{title || "Untitled"}</h1>
              <div className="body" dangerouslySetInnerHTML={{ __html: body.trim() ? renderMarkdown(body) : '<p class="muted">Nothing to preview yet.</p>' }} /></div>
          )}
          <PhiNotice text={`${title}\n${summary}\n${body}`} />
        </div>

        <div className="row2">
          <div className="field"><label htmlFor="codes">Codes covered</label>
            <input type="text" id="codes" name="codes" value={codesText} onChange={(e) => setCodesText(e.target.value)} placeholder="99214, G2211, M54.50" />
            <div className="parsed">{codes.map((c) => { const k = classifyCode(c); return <span key={c} className={`chip ${k ? "code" : "bad"}`}>{c}<small>{k ?? "unrecognized"}</small></span>; })}</div>
            <span className="hint">Questions about these codes will link to this update.</span></div>
          <div className="field"><label htmlFor="effectiveDate">Effective date</label>
            <input type="date" id="effectiveDate" name="effectiveDate" defaultValue={a?.effectiveDate ?? ""} style={{ width: "100%", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 11px" }} />
            <span className="hint">When the change takes effect. Leave blank for general articles.</span></div>
        </div>

        <div className="field"><span className="lbl">Payers</span>
          <div className="modpick">{EXPERT_PAYERS.map((p) => <label key={p} style={{ fontFamily: "var(--f-body)" }}><input type="checkbox" name="payers" value={p} defaultChecked={a?.payers.includes(p)} />{p}</label>)}</div></div>

        <div className="row2">
          <div className="field"><label htmlFor="specialty">Specialty</label>
            <select id="specialty" name="specialty" defaultValue={a?.specialty ?? ""}><option value="">All specialties</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="sourceUrl">Official source link</label>
            <input type="text" id="sourceUrl" name="sourceUrl" defaultValue={a?.sourceUrl ?? ""} placeholder="https://www.cms.gov/…" /></div>
        </div>

        {state?.errors && <ul className="errors" role="alert">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="submit" className="btn" value="publish" disabled={pending}>{pending ? "Saving…" : published ? "Update published article" : "Publish"}</button>
          <button type="submit" className="btn ghost" value="draft" disabled={pending}>{published ? "Unpublish and save as draft" : "Save draft"}</button>
        </div>
      </div>
    </form>
  );
}
