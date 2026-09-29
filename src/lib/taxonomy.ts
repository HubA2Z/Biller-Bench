export const MODIFIERS = ["25","59","XE","XS","XP","XU","26","TC","50","RT","LT","76","77","91","24","57","95","GT","KX","GA"] as const;

export const MAC_JURISDICTIONS = [
  "Novitas JL","Novitas JH","Palmetto GBA JJ","Palmetto GBA JM","NGS J6","NGS JK",
  "Noridian JE","Noridian JF","WPS J5","WPS J8","CGS J15","First Coast JN",
] as const;

export const COMMERCIAL_PAYERS = ["Aetna","BCBS","Cigna","Humana","Meritain Health","Optum","UHC","UMR"] as const;

export const STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

export const SPECIALTIES = [
  "Primary Care","Orthopedics","Pain Management","Mental Health","Telehealth",
  "Cardiology","Physical Therapy","Dermatology","Radiology",
] as const;

export const EHR_SYSTEMS = ["Epic","athenahealth","eClinicalWorks","Tebra (Kareo)","NextGen","AdvancedMD","CMD"] as const;

export const PAYER_GROUPS: Record<string, readonly string[]> = {
  Medicare: MAC_JURISDICTIONS,
  Medicaid: STATES,
  Commercial: COMMERCIAL_PAYERS,
  TRICARE: ["East", "West"],
  "Workers' Comp": STATES,
};

export function payerLabel(group: string, name: string) {
  return group === "Commercial" ? name : `${group} · ${name}`;
}

export function isValidPayer(group: string, name: string) {
  return !!PAYER_GROUPS[group]?.includes(name);
}
