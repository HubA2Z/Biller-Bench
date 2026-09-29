import { describe, expect, it } from "vitest";
import { addBusinessHours, formatDuration } from "@/lib/sla";

describe("addBusinessHours (Mon–Fri 9–5 Eastern)", () => {
  it("adds within the same day", () => {
    // Tue 2026-09-29 10:00 EDT = 14:00 UTC
    expect(addBusinessHours(new Date("2026-09-29T14:00:00Z"), 4).toISOString()).toBe("2026-09-29T18:00:00.000Z");
  });
  it("rolls past 5pm into the next business morning", () => {
    // Tue 3:00pm EDT + 4h = Wed 11:00am EDT
    expect(addBusinessHours(new Date("2026-09-29T19:00:00Z"), 4).toISOString()).toBe("2026-09-30T15:00:00.000Z");
  });
  it("skips the weekend", () => {
    // Fri 2026-10-02 4:00pm EDT + 2h = Mon 10:00am EDT
    expect(addBusinessHours(new Date("2026-10-02T20:00:00Z"), 2).toISOString()).toBe("2026-10-05T14:00:00.000Z");
  });
  it("starts the clock at 9am for questions asked overnight", () => {
    // Wed 11:00pm EDT + 1h = Thu 10:00am EDT
    expect(addBusinessHours(new Date("2026-10-01T03:00:00Z"), 1).toISOString()).toBe("2026-10-01T14:00:00.000Z");
  });
});

describe("formatDuration", () => {
  it("formats minutes, hours and days", () => {
    expect([45, 130, 60 * 26].map((m) => formatDuration(m * 60_000))).toEqual(["45m", "2h 10m", "1d 2h"]);
  });
});
