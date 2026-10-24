/** Roles visitors can pick in the "Who's reading?" card, with the follow-up question for each. */
const PRACTICE_HELP = { question: "Need billing help?", yes: "/contact?topic=" + encodeURIComponent("Billing services for my practice") + "&from=card" };
const BILLER_HELP = { question: "Looking for billing services or billing help?", yes: "/contact?topic=" + encodeURIComponent("Billing help for my billing team or company") + "&from=card" };

export const AUDIENCE_ROLES = {
  physician: { label: "Physician or provider", followUp: PRACTICE_HELP, browse: { text: "Browse the Denial Code Library", href: "/denials" } },
  practice: { label: "Practice owner or manager", followUp: PRACTICE_HELP, browse: { text: "See our billing services", href: "/services" } },
  biller: { label: "Medical biller or coder", followUp: BILLER_HELP, browse: { text: "Browse the Denial Code Library", href: "/denials" } },
  company: { label: "Billing company", followUp: BILLER_HELP, browse: { text: "Browse the Denial Code Library", href: "/denials" } },
  other: { label: "Student, patient or other", followUp: null, browse: { text: "Browse answered billing questions", href: "/" } },
} as const;
export type AudienceRole = keyof typeof AUDIENCE_ROLES;
export const isAudienceRole = (r: string): r is AudienceRole => r in AUDIENCE_ROLES;
