/**
 * How the asker of a published Q&A is shown. "member" questions show the
 * signed-in user; the others are anonymous labels chosen by the team.
 */
export const ASKER_LABELS = {
  provider: { option: "A provider", byline: "Asked by a provider", list: "Provider question", short: "Provider" },
  biller: { option: "A medical biller", byline: "Asked by a medical biller", list: "Biller question", short: "Biller" },
  reader: { option: "A BillerBench reader", byline: "Asked by a BillerBench reader", list: "Reader question", short: "BillerBench reader" },
  team: { option: "Common question (our team)", byline: "Common question · answered by the BillerBench team", list: "Common question", short: "Common question · BillerBench team" },
} as const;
export type AskerSource = keyof typeof ASKER_LABELS;
export const ASKER_SOURCES = Object.keys(ASKER_LABELS) as AskerSource[];
export const askerLabel = (source: string) => ASKER_LABELS[source as AskerSource] ?? null;
