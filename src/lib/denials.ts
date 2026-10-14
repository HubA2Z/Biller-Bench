/**
 * Denial Code Library helpers. No server-only imports, so the deploy script can use them.
 *
 * File format for content/denials/*.md:
 *
 *   ---
 *   code: 97
 *   group: CO
 *   category: coding
 *   title: CO-97 Denial Code: Meaning, Causes and How to Fix It   # optional
 *   quick_answer: Two or three sentences shown at the top and in Google.
 *   related: 4, 236, B15
 *   ---
 *   ## What it means
 *   ...
 */
import { scanPHI } from "./phi";

export const DENIAL_CATEGORIES = {
  patient: { label: "Patient responsibility", desc: "Deductible, coinsurance and copay amounts the patient owes." },
  eligibility: { label: "Eligibility and coverage", desc: "The patient wasn't covered, or the service isn't a covered benefit." },
  coding: { label: "Coding and bundling", desc: "Code combinations, modifiers, diagnosis pointers and bundling edits." },
  authorization: { label: "Authorization and referral", desc: "Missing or mismatched prior authorizations and referrals." },
  filing: { label: "Timely filing and duplicates", desc: "Late claims, duplicates and corrected claims." },
  cob: { label: "Coordination of benefits", desc: "Another payer is primary, or other insurance information is needed." },
  provider: { label: "Provider and enrollment", desc: "Credentialing, enrollment, taxonomy and rendering provider issues." },
  documentation: { label: "Documentation and medical necessity", desc: "Medical necessity, records requests and documentation." },
  limits: { label: "Limits and frequency", desc: "Benefit maximums, frequency limits and plan exclusions." },
  info: { label: "Missing information", desc: "Claims rejected or denied for missing or invalid data." },
} as const;
export type DenialCategory = keyof typeof DENIAL_CATEGORIES;

export const GROUP_CODES = {
  CO: "Contractual obligation: the practice adjusts it off and can't bill the patient.",
  PR: "Patient responsibility: the patient owes this amount.",
  OA: "Other adjustment: neither CO nor PR applies, often used for balancing or crossover.",
  PI: "Payer-initiated reduction: the payer reduced it, but it isn't a contractual write-off.",
} as const;
export type GroupCode = keyof typeof GROUP_CODES;

export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/^0+(?=\d)/, "");
export const denialSlug = (group: string, code: string) => `${group.toLowerCase()}-${normalizeCode(code).toLowerCase()}`;
export const denialPath = (d: { slug: string }) => `/denials/${d.slug}`;
export const defaultTitle = (group: string, code: string) => `${group}-${normalizeCode(code)} Denial Code: Meaning, Causes and How to Fix It`;

/** Turns "/denials/97", "/denials/pr-97" or "/denials/CO97" into the bare code "97". */
export function codeFromParam(param: string): string | null {
  const m = decodeURIComponent(param).trim().match(/^(?:(?:co|pr|oa|pi|cr)[-\s]?)?([a-z]?\d{1,3}|[a-z]\d{1,2})$/i);
  return m ? normalizeCode(m[1]) : null;
}

/** Denial codes mentioned in free text, e.g. "CO-97", "PR 204", "CARC 16", "denial code 50". */
export function mentionedCodes(text: string): string[] {
  const found = new Set<string>();
  const re = /\b(?:(?:CO|PR|OA|PI)[\s-]?|CARC\s?#?|denial\s+code\s+#?)([A-Z]?\d{1,3})\b/gi;
  for (const m of text.matchAll(re)) found.add(normalizeCode(m[1]));
  return [...found].slice(0, 6);
}

export type ParsedDenial = {
  code: string; groupCode: GroupCode; slug: string; category: DenialCategory;
  title: string; quickAnswer: string; body: string; related: string[];
};

const unquote = (v = "") => v.trim().replace(/^["'](.*)["']$/s, "$1").trim();

export function parseDenialFile(text: string): { ok: true; denial: ParsedDenial } | { ok: false; errors: string[] } {
  const m = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { ok: false, errors: ["Missing the --- header block at the top of the file."] };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.replace(/\s+#.*$/, "").match(/^\s*([A-Za-z_ ]+?)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase().replace(/\s+/g, "_")] = kv[2].trim();
  }
  const errors: string[] = [];
  const code = normalizeCode(unquote(meta.code));
  if (!/^([A-Z]?\d{1,3})$/.test(code)) errors.push(`code "${meta.code}" should look like 97 or B7.`);
  const groupCode = unquote(meta.group || "CO").toUpperCase() as GroupCode;
  if (!(groupCode in GROUP_CODES)) errors.push(`group must be one of ${Object.keys(GROUP_CODES).join(", ")}.`);
  const category = unquote(meta.category).toLowerCase() as DenialCategory;
  if (!(category in DENIAL_CATEGORIES)) errors.push(`category must be one of ${Object.keys(DENIAL_CATEGORIES).join(", ")}.`);
  const title = unquote(meta.title) || defaultTitle(groupCode, code);
  const quickAnswer = unquote(meta.quick_answer);
  const body = m[2].trim();
  if (title.length < 10 || title.length > 160) errors.push("title must be 10–160 characters.");
  if (quickAnswer.length < 60 || quickAnswer.length > 600) errors.push("quick_answer must be 60–600 characters.");
  if (body.length < 300) errors.push("Body must be at least 300 characters.");
  const related = unquote(meta.related).split(",").map((s) => normalizeCode(s)).filter((s) => /^[A-Z]?\d{1,3}$/.test(s) && s !== code).slice(0, 8);
  if (scanPHI(`${title}\n${quickAnswer}\n${body}`).length) errors.push("Possible patient identifiers found.");
  if (errors.length) return { ok: false, errors };
  return { ok: true, denial: { code, groupCode, slug: denialSlug(groupCode, code), category, title, quickAnswer, body, related } };
}
