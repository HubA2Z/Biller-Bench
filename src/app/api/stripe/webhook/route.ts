// Removed in v0.6: BillerBench is free, so there are no payments. This file is safe to delete.
export function POST() {
  return new Response("Payments are no longer used.", { status: 410 });
}
