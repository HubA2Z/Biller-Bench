/**
 * Public company details. Contact details are optional and come from Vercel
 * settings, so they can be changed without touching code:
 * CONTACT_EMAIL, CONTACT_PHONE, CONTACT_ADDRESS, CONTACT_HOURS.
 */
export const company = () => ({
  name: "BillerBench",
  email: process.env.CONTACT_EMAIL?.trim() || null,
  phone: process.env.CONTACT_PHONE?.trim() || null,
  address: process.env.CONTACT_ADDRESS?.trim() || null,
  hours: process.env.CONTACT_HOURS?.trim() || "Monday to Friday, 9am–5pm US Eastern",
});

const httpsUrl = (v?: string) => (v && /^https:\/\/\S+$/i.test(v.trim()) ? v.trim() : null);

/** Social profiles shown in the footer, on the Contact page and in search engine data. Set SOCIAL_LINKEDIN_URL and SOCIAL_INSTAGRAM_URL. */
export const socialLinks = () =>
  ([
    { label: "LinkedIn", url: httpsUrl(process.env.SOCIAL_LINKEDIN_URL) },
    { label: "Instagram", url: httpsUrl(process.env.SOCIAL_INSTAGRAM_URL) },
  ] as const).filter((s): s is { label: "LinkedIn" | "Instagram"; url: string } => Boolean(s.url));

export const CONTACT_TOPICS = [
  "A question about BillerBench",
  "Billing services for my practice",
  "Partnership or sponsorship",
  "Report a problem with the site",
  "Privacy or account request",
  "Something else",
] as const;

/** Roles we recruit for. Applications are kept on file even when a role isn't open. */
export const CAREER_ROLES = [
  { id: "biller", title: "Certified medical biller", desc: "Answer provider questions on BillerBench and work claims for our billing clients.", needs: ["CPB, CPC or equivalent credential", "2+ years of US medical billing", "Strong denial and appeals experience"] },
  { id: "coder", title: "Certified medical coder", desc: "Review coding questions and help practices get CPT, HCPCS and ICD-10 right.", needs: ["CPC, CCS or equivalent", "E/M and modifier expertise", "Specialty experience a plus"] },
  { id: "ar", title: "AR follow-up specialist", desc: "Work unpaid and denied claims with payers until they're resolved.", needs: ["Payer portal and phone follow-up", "Clear claim notes", "Commercial and Medicare experience"] },
  { id: "auth", title: "Eligibility and prior authorization specialist", desc: "Verify coverage and secure authorizations before visits.", needs: ["Eligibility and benefits checks", "Prior auth submissions and tracking", "Attention to detail"] },
  { id: "cred", title: "Credentialing specialist", desc: "Enroll providers with payers and keep credentials current.", needs: ["Payer enrollment and CAQH", "Revalidations", "Organized follow-up"] },
  { id: "other", title: "Other roles", desc: "Operations, client success, or something we haven’t listed.", needs: [] },
] as const;

/** Shown on the About page. Edit freely. */
export const MISSION = "Help every US practice get paid correctly for the care it gives, by putting certified billers within reach of any provider, free.";
