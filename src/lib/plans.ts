import type { Plan } from "@/db/schema";

export type PlanInfo = {
  key: Plan;
  name: string;
  priceCents: number;
  /** Private questions included per calendar month. */
  quota: number;
  /** Business hours until an answer is due. */
  slaBusinessHours: number;
  slaLabel: string;
  points: string[];
  stripePriceEnv?: string;
};

export const PLANS: Record<Plan, PlanInfo> = {
  FREE: {
    key: "FREE", name: "Free", priceCents: 0, quota: 0, slaBusinessHours: 24, slaLabel: "2–3 business days",
    points: ["Public questions", "Answered by our certified team", "Answers become public pages"],
  },
  BASIC: {
    key: "BASIC", name: "Practice Basic", priceCents: 4900, quota: 5, slaBusinessHours: 8, slaLabel: "Next business day",
    points: ["5 private questions a month", "Answers by the next business day", "Private or public, your choice"],
    stripePriceEnv: "STRIPE_PRICE_BASIC",
  },
  PRO: {
    key: "PRO", name: "Practice Pro", priceCents: 14900, quota: 20, slaBusinessHours: 4, slaLabel: "4 business hours",
    points: ["20 private questions a month", "Answers within 4 business hours", "One 30-minute call a month"],
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  DEDICATED: {
    key: "DEDICATED", name: "Dedicated Biller", priceCents: 29900, quota: 200, slaBusinessHours: 4, slaLabel: "Same business day",
    points: ["A named biller for your practice", "Knows your payers and software", "Fair-use unlimited questions"],
    stripePriceEnv: "STRIPE_PRICE_DEDICATED",
  },
};

export const URGENT = { priceCents: 2900, slaBusinessHours: 4, slaLabel: "4 business hours" };

export const SERVICES = [
  { id: "appeal", name: "Appeal letter", desc: "We write the appeal or redetermination request with citations.", price: "$49 per appeal" },
  { id: "corrected", name: "Corrected claim", desc: "We fix and resubmit a denied or rejected claim.", price: "$15 per claim" },
  { id: "audit", name: "Denial audit", desc: "Review of your last 90 days of denials with a fix list.", price: "$199, credited if you switch" },
  { id: "ar", name: "Old AR recovery", desc: "We work unpaid claims older than 90 days.", price: "25% of recovered" },
  { id: "rcm", name: "Full billing service", desc: "We run your billing end to end.", price: "From 5% of collections" },
  { id: "cred", name: "Payer credentialing", desc: "Enrollment and re-credentialing with payers.", price: "$150 per payer" },
] as const;

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
