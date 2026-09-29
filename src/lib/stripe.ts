import "server-only";
import Stripe from "stripe";

/** Skips Stripe for local testing. Only ever active when the site runs on localhost. */
export const fakePayments = () =>
  process.env.DEV_FAKE_PAYMENTS === "true" && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(appUrl());

let client: Stripe | null = null;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Set it, or set DEV_FAKE_PAYMENTS=true in development.");
  client ??= new Stripe(key);
  return client;
}

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
