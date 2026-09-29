"use client";
import { scanPHI } from "@/lib/phi";

export function PhiNotice({ text }: { text: string }) {
  if (!text.trim()) return null;
  const hits = scanPHI(text);
  if (!hits.length) return <div className="phi ok">No patient identifiers detected.</div>;
  const list = (
    <ul>{hits.map((h) => <li key={h.rule}>{h.rule}: {h.samples.map((s) => <mark key={s}>{s}</mark>)} {h.fix}</li>)}</ul>
  );
  return <div className="phi bad" role="alert"><strong>Possible patient identifiers found. Remove them before posting. BillerBench never stores patient information.</strong>{list}</div>;
}
