/**
 * Parses a common-question file from content/questions. Format:
 *
 *   ---
 *   title: Why did Medicare deny 99214 with CO-97 when billed with a joint injection?
 *   codes: 99214, 20610
 *   payer_group: Medicare        # Medicare, Medicaid, Commercial, TRICARE, Workers' Comp, General
 *   payer_name: All payers       # must exist in that group (General → All payers)
 *   state: US                    # US for all states, or a two-letter state
 *   specialty: Primary Care
 *   ---
 *   # Question
 *   The question, written as a reader would ask it.
 *
 *   # Answer
 *   The expert answer in Markdown.
 *
 * No server-only imports, so the deploy script can use it.
 */
import { classifyCode, parseCodes } from "./codes";
import { scanPHI } from "./phi";
import { SPECIALTIES, STATES, isValidPayer } from "./taxonomy";

export type ParsedQA = { title: string; body: string; answer: string; codes: string[]; payerGroup: string; payerName: string; state: string; specialty: string };

const unquote = (v = "") => v.trim().replace(/^["'](.*)["']$/s, "$1").trim();

export function parseQAFile(text: string): { ok: true; qa: ParsedQA } | { ok: false; errors: string[] } {
  const m = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { ok: false, errors: ["Missing the --- header block."] };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.replace(/\s+#.*$/, "").match(/^\s*([A-Za-z_ ]+?)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase().replace(/\s+/g, "_")] = kv[2].trim();
  }
  const parts = m[2].split(/^# (Question|Answer)\s*$/m);
  const section = (name: string) => { const i = parts.indexOf(name); return i >= 0 ? (parts[i + 1] ?? "").trim() : ""; };
  const errors: string[] = [];
  const title = unquote(meta.title), body = section("Question"), answer = section("Answer");
  if (title.length < 15 || title.length > 200) errors.push("title must be 15–200 characters.");
  if (body.length < 30) errors.push("The # Question section must be at least 30 characters.");
  if (answer.length < 60) errors.push("The # Answer section must be at least 60 characters.");
  const codes = parseCodes(unquote(meta.codes)).slice(0, 12);
  if (!codes.length) errors.push("codes: tag at least one code.");
  const bad = codes.filter((c) => !classifyCode(c));
  if (bad.length) errors.push(`Unrecognized codes: ${bad.join(", ")}.`);
  const payerGroup = unquote(meta.payer_group || "General"), payerName = unquote(meta.payer_name || "All payers");
  if (!isValidPayer(payerGroup, payerName)) errors.push(`Unknown payer "${payerGroup} / ${payerName}".`);
  const state = unquote(meta.state || "US").toUpperCase();
  if (state !== "US" && !STATES.includes(state)) errors.push(`Unknown state "${state}".`);
  const specialty = (SPECIALTIES as readonly string[]).find((s) => s.toLowerCase() === unquote(meta.specialty || "Primary Care").toLowerCase());
  if (!specialty) errors.push(`Unknown specialty "${meta.specialty}".`);
  if (scanPHI(`${title}\n${body}\n${answer}`).length) errors.push("Possible patient identifiers found.");
  if (errors.length) return { ok: false, errors };
  return { ok: true, qa: { title, body, answer, codes, payerGroup, payerName, state, specialty: specialty! } };
}
