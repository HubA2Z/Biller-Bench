/**
 * Google Analytics 4. The measurement ID can be changed with NEXT_PUBLIC_GA_ID.
 * Events never include names, emails or message text.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-KL04RHTF1D";

type Gtag = (...args: unknown[]) => void;

export function track(event: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  if (g) g("event", event, params);
}
