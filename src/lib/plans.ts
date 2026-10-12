/** BillerBench is free for providers. Revenue comes from billing services. */

/** Every question is answered within this many business hours (Mon–Fri, 9–5 Eastern). */
export const ANSWER_TIME = { slaBusinessHours: 8, label: "1 business day" };

export type Service = { id: string; name: string; desc: string; points: string[] };

export const SERVICES: Service[] = [
  { id: "rcm", name: "Full billing service", desc: "We run your billing end to end so your team can focus on patients.",
    points: ["Charge entry and claim submission", "Payment posting and denial follow-up", "Monthly reports on collections"] },
  { id: "eligibility", name: "Eligibility verification", desc: "We check coverage and benefits before visits to prevent denials.",
    points: ["Active coverage and plan details", "Copay, deductible and coinsurance", "Referral and authorization requirements"] },
  { id: "prior-auth", name: "Prior authorization", desc: "We request and track prior authorizations with payers.",
    points: ["Submission with clinical documentation", "Follow-up until a decision", "Appeals for denied authorizations"] },
  { id: "appeal", name: "Appeals", desc: "We write appeals and redetermination requests with the policy citations payers expect.",
    points: ["Medicare redeterminations and reconsiderations", "Commercial payer appeals", "Tracking to resolution"] },
  { id: "corrected", name: "Corrected claims", desc: "We fix and resubmit denied or rejected claims.",
    points: ["Coding and modifier corrections", "Clearinghouse rejections", "Resubmission and follow-up"] },
  { id: "audit", name: "Denial audit", desc: "We review your recent denials and give you a fix list.",
    points: ["Top denial reasons by payer", "Root causes and fixes", "Quick-win recovery list"] },
  { id: "ar", name: "Old AR recovery", desc: "We work unpaid claims older than 90 days.",
    points: ["Payer calls and portal follow-up", "Appeals where needed", "Write-off recommendations"] },
  { id: "cred", name: "Payer credentialing", desc: "We handle payer enrollment and re-credentialing.",
    points: ["New payer enrollment", "CAQH and revalidations", "Status tracking"] },
];
