/**
 * Parses an update file from content/updates. Format:
 *
 *   ---
 *   title: 2026 E/M changes billers need to know
 *   summary: One or two sentences for lists and Google.
 *   kind: coding update        # article | coding update | payer update
 *   codes: 99213, 99214, G2211
 *   payers: Medicare, UHC
 *   specialty: Primary Care
 *   effective_date: 2026-01-01
 *   source_url: https://www.cms.gov/...
 *   status: draft              # draft (default) or published
 *   ---
 *   ## What changed
 *   Markdown body...
 *
 * No dependencies and no server-only imports, so the deploy script can use it.
 */
import { classifyCode, parseCodes } from "./codes";
import { scanPHI } from "./phi";
import { SPECIALTIES } from "./taxonomy";
import { EXPERT_PAYERS } from "./team";

export type ParsedUpdate = {
  kind: "ARTICLE" | "CODING_UPDATE" | "PAYER_UPDATE";
  title: string; summary: string; body: string;
  codes: string[]; payers: string[]; specialty: string | null;
  effectiveDate: Date | null; sourceUrl: string | null;
  wantsPublish: boolean;
};

const KIND: Record<string, ParsedUpdate["kind"]> = {
  article: "ARTICLE", guide: "ARTICLE",
  "coding update": "CODING_UPDATE", coding_update: "CODING_UPDATE", coding: "CODING_UPDATE",
  "payer update": "PAYER_UPDATE", payer_update: "PAYER_UPDATE", payer: "PAYER_UPDATE",
};

const list = (v = "") => v.replace(/^\[|\]$/g, "").split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
const unquote = (v = "") => v.trim().replace(/^["'](.*)["']$/s, "$1").trim();

export function parseUpdateFile(text: string): { ok: true; update: ParsedUpdate } | { ok: false; errors: string[] } {
  const m = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { ok: false, errors: ["Missing the --- header block at the top of the file."] };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.replace(/\s+#.*$/, "").match(/^\s*([A-Za-z_ ]+?)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase().replace(/\s+/g, "_")] = kv[2].trim();
  }
  const errors: string[] = [];
  const title = unquote(meta.title);
  const summary = unquote(meta.summary);
  const body = m[2].trim();
  const kind = KIND[unquote(meta.kind || "article").toLowerCase()];
  if (!kind) errors.push(`Unknown kind "${meta.kind}". Use article, coding update or payer update.`);
  if (title.length < 10 || title.length > 160) errors.push("Title must be 10–160 characters.");
  if (summary.length < 30 || summary.length > 300) errors.push("Summary must be 30–300 characters.");
  if (body.length < 80) errors.push("Body must be at least 80 characters.");

  const codes = parseCodes(list(meta.codes).join(",")).slice(0, 20);
  const bad = codes.filter((c) => !classifyCode(c));
  if (bad.length) errors.push(`Not a recognized CPT, HCPCS or ICD-10 code: ${bad.join(", ")}.`);

  const payers: string[] = [];
  for (const p of list(meta.payers)) {
    const match = EXPERT_PAYERS.find((x) => x.toLowerCase() === p.toLowerCase());
    if (match) payers.push(match); else errors.push(`Unknown payer "${p}". Use one of: ${EXPERT_PAYERS.join(", ")}.`);
  }
  const specRaw = unquote(meta.specialty);
  const specialty = specRaw ? (SPECIALTIES as readonly string[]).find((s) => s.toLowerCase() === specRaw.toLowerCase()) ?? null : null;
  if (specRaw && !specialty) errors.push(`Unknown specialty "${specRaw}".`);

  const ed = unquote(meta.effective_date);
  const effectiveDate = /^\d{4}-\d{2}-\d{2}$/.test(ed) ? new Date(`${ed}T12:00:00Z`) : null;
  if (ed && !effectiveDate) errors.push("effective_date must look like 2026-01-01.");
  const sourceUrl = unquote(meta.source_url) || null;
  if (sourceUrl && !/^https:\/\/\S+$/.test(sourceUrl)) errors.push("source_url must start with https://");

  if (scanPHI(`${title}\n${summary}\n${body}`).length) errors.push("Possible patient identifiers found. BillerBench never stores patient information.");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    update: { kind: kind!, title, summary, body, codes, payers: [...new Set(payers)], specialty, effectiveDate, sourceUrl,
      wantsPublish: unquote(meta.status).toLowerCase() === "published" },
  };
}
