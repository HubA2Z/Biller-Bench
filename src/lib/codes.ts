export type CodeKind = "CPT" | "HCPCS" | "ICD-10";

export function classifyCode(raw: string): CodeKind | null {
  const c = raw.toUpperCase();
  if (/^\d{5}$/.test(c) || /^\d{4}[FTU]$/.test(c)) return "CPT";
  if (/^[A-V]\d{4}$/.test(c)) return "HCPCS";
  if (/^[A-TV-Z]\d[0-9A-Z](\.[0-9A-Z]{1,4})?$/.test(c)) return "ICD-10";
  return null;
}

export function parseCodes(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map((x) => x.trim().toUpperCase().replace(/^-/, "")).filter(Boolean))];
}
