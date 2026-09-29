/** NPI check digit: Luhn over the prefix "80840" plus the 10-digit NPI. */
export function isValidNpi(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;
  const s = "80840" + npi;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = Number(s[s.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export type NpiRecord = {
  npi: string;
  type: "NPI-1" | "NPI-2";
  name: string;
  lastName?: string;
  organization?: string;
  taxonomy?: string;
  state?: string;
};

/** Looks up an NPI in the CMS NPPES registry. Call from the server only. */
export async function lookupNpi(npi: string): Promise<NpiRecord | null> {
  const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${encodeURIComponent(npi)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`NPI registry returned ${res.status}`);
  const data = (await res.json()) as { result_count?: number; results?: any[] };
  const r = data.results?.[0];
  if (!r) return null;
  const b = r.basic ?? {};
  const isOrg = r.enumeration_type === "NPI-2";
  const tax = (r.taxonomies ?? []).find((t: any) => t.primary) ?? r.taxonomies?.[0];
  const loc = (r.addresses ?? []).find((a: any) => a.address_purpose === "LOCATION") ?? r.addresses?.[0];
  return {
    npi,
    type: isOrg ? "NPI-2" : "NPI-1",
    name: isOrg ? b.organization_name : [b.first_name, b.last_name].filter(Boolean).join(" "),
    lastName: b.last_name,
    organization: b.organization_name,
    taxonomy: tax?.desc,
    state: loc?.state,
  };
}

const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * An NPI proves a provider exists, not that the person signing up is them.
 * Auto-verify only when the registry name matches the account; otherwise
 * leave it for staff to review.
 */
export function npiMatchesAccount(rec: NpiRecord, userName: string, practiceName?: string | null) {
  if (rec.type === "NPI-1" && rec.lastName) return norm(userName).split(" ").includes(norm(rec.lastName));
  if (rec.type === "NPI-2" && rec.organization && practiceName) {
    const a = norm(rec.organization), b = norm(practiceName);
    return a.includes(b) || b.includes(a);
  }
  return false;
}
