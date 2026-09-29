/**
 * Pattern scan for patient identifiers. It catches common mistakes; it is not
 * a guarantee. Public posts are blocked on any hit; private posts (covered by
 * a BAA) only get a warning.
 */
export type PhiHit = { rule: string; fix: string; samples: string[] };

const L = "AC-HJKMNP-RT-Y"; // letters allowed in a Medicare Beneficiary Identifier

export const PHI_RULES: { name: string; re: RegExp; fix: string }[] = [
  { name: "Social Security number", re: /\b\d{3}-\d{2}-\d{4}\b|\b(?:SSN|social security)[\s#:]*\d{9}\b/gi, fix: "Remove the SSN." },
  { name: "Medicare Beneficiary Identifier (MBI)", re: new RegExp(`\\b[1-9][${L}][${L}0-9]\\d-?[${L}][${L}0-9]\\d-?[${L}]{2}\\d{2}\\b`, "g"), fix: "Remove member and subscriber IDs." },
  { name: "Phone number", re: /(?:\(\d{3}\)\s?|\b\d{3}[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, fix: "Remove phone numbers. This also catches NPIs; say “the rendering provider” instead." },
  { name: "Claim ID (11 digits)", re: /\b\d{11}\b/g, fix: "Replace claim numbers with “the claim”." },
  { name: "Full date (DOB or date of service)", re: /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)?\d{2}\b|\b(?:DOB|date of birth)\b[:\s]*\S+/gi, fix: "HIPAA treats full dates tied to a patient as identifiers. Use the year only, or “last month”." },
  { name: "Street address", re: /\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Ct|Court|Way|Pkwy)\b\.?/g, fix: "Remove addresses." },
  { name: "Email address", re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, fix: "Remove email addresses." },
  { name: "Patient name", re: /\b(?:Mr|Mrs|Ms|Miss)\.?\s+[A-Z][a-z]+|\bpatient(?: name)?[:\s]+[A-Z][a-z]+\s+[A-Z][a-z]+/g, fix: "Say “the patient” instead of a name." },
];

export function scanPHI(text: string): PhiHit[] {
  const hits: PhiHit[] = [];
  for (const r of PHI_RULES) {
    const m = text.match(r.re);
    if (m) hits.push({ rule: r.name, fix: r.fix, samples: [...new Set(m)].slice(0, 3) });
  }
  return hits;
}
