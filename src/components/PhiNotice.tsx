"use client";
import { scanPHI } from "@/lib/phi";

export function PhiNotice({ text, isPublic }: { text: string; isPublic: boolean }) {
  if (!text.trim()) return null;
  const hits = scanPHI(text);
  if (!hits.length) return <div className="phi ok">No patient identifiers detected.</div>;
  const list = (
    <ul>{hits.map((h) => <li key={h.rule}>{h.rule}: {h.samples.map((s) => <mark key={s}>{s}</mark>)} {h.fix}</li>)}</ul>
  );
  return isPublic
    ? <div className="phi bad" role="alert"><strong>Possible patient identifiers found. Public posts are blocked until they’re removed.</strong>{list}</div>
    : <div className="phi bad" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)" }}><strong>Identifiers found. Private questions are covered by our BAA, so you can post this, but share only what we need.</strong>{list}</div>;
}
