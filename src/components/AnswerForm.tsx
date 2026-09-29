"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { postAnswer, type AnswerState } from "@/app/actions/answers";
import { renderMarkdown } from "@/lib/markdown";
import { PhiNotice } from "./PhiNotice";
import { SubmitButton } from "./SubmitButton";

const REFS: [string, string][] = [
  ["Bold", "**bold**"], ["Code", "`CODE`"], ["List", "\n- item"],
  ["+ LCD link", "[LCD L00000 – title](https://www.cms.gov/medicare-coverage-database/search.aspx)"],
  ["+ NCD link", "[NCD 000.0 – title](https://www.cms.gov/medicare-coverage-database/search.aspx)"],
  ["+ NCCI manual", "[NCCI Policy Manual](https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-policy-manual)"],
  ["+ Payer policy", "[Payer policy bulletin](https://)"],
];

export function AnswerForm({ questionId, path, staff, isPublic }: { questionId: string; path: string; staff: boolean; isPublic: boolean }) {
  const [state, action] = useActionState<AnswerState, FormData>(postAnswer, undefined);
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [type, setType] = useState(staff ? "EXPERT" : "FOLLOWUP");
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (state?.ok) { setBody(""); setTab("write"); } }, [state]);

  const insert = (s: string) => {
    const el = ta.current; if (!el) return;
    const a = el.selectionStart, b = el.selectionEnd;
    const next = body.slice(0, a) + s + body.slice(b);
    setBody(next);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = a + s.length; });
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <form action={action} className="form">
        <h2>{staff ? "Reply as BillerBench team" : "Add a follow-up for our team"}</h2>
        <input type="hidden" name="questionId" value={questionId} />
        <input type="hidden" name="path" value={path} />
        <input type="hidden" name="body" value={body} />
        {staff && (
          <div className="typepick">
            <label><input type="radio" name="type" value="EXPERT" checked={type === "EXPERT"} onChange={() => setType("EXPERT")} /><span><strong>Expert answer</strong><br /><span className="muted">Stops the due-time clock. The asker can mark it as the solution.</span></span></label>
            <label><input type="radio" name="type" value="FOLLOWUP" checked={type === "FOLLOWUP"} onChange={() => setType("FOLLOWUP")} /><span><strong>Follow-up</strong><br /><span className="muted">Ask for a detail. The clock keeps running.</span></span></label>
          </div>
        )}
        <div className="field">
          <div className="tabs">
            <button type="button" aria-pressed={tab === "write"} onClick={() => setTab("write")}>Write</button>
            <button type="button" aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Preview</button>
          </div>
          {tab === "write" ? (
            <>
              {staff && <div className="toolbar" aria-label="Insert reference">{REFS.map(([l, s]) => <button type="button" key={l} onClick={() => insert(s)}>{l}</button>)}</div>}
              <textarea ref={ta} aria-label="Reply" value={body} onChange={(e) => setBody(e.target.value)}
                placeholder={staff ? "Explain the rule, cite the LCD, NCD or payer policy, and say what to do next." : "Answer the team's question or add detail."} />
            </>
          ) : (
            <div className="preview body" dangerouslySetInnerHTML={{ __html: body.trim() ? renderMarkdown(body) : '<span class="muted">Nothing to preview yet.</span>' }} />
          )}
        </div>
        <PhiNotice text={body} isPublic={isPublic} />
        {state?.error && <ul className="errors" role="alert"><li>{state.error}</li></ul>}
        <div><SubmitButton pendingText="Posting…">Post {type === "EXPERT" ? "answer" : "follow-up"}</SubmitButton></div>
      </form>
    </div>
  );
}
