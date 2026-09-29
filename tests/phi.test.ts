import { describe, expect, it } from "vitest";
import { scanPHI } from "@/lib/phi";

describe("scanPHI", () => {
  it("flags each identifier type", () => {
    const text = "Mrs. Johnson, DOB 04/12/1961, claim 20240519883, call (614) 555-0182, SSN 123-45-6789, MBI 1EG4-TE5-MK73, lives at 12 Oak Street, email jo@mail.com";
    const rules = scanPHI(text).map((h) => h.rule);
    expect(rules).toEqual(expect.arrayContaining([
      "Social Security number", "Medicare Beneficiary Identifier (MBI)", "Phone number", "Claim ID (11 digits)",
      "Full date (DOB or date of service)", "Street address", "Email address", "Patient name",
    ]));
  });
  it("does not flag normal coding questions", () => {
    const text = "99214-25 with 20610 denied CO-97 by Novitas JL. Diagnosis M17.11, G2211 and G0008 in 2025. Modifier 59 vs XU on 97140 and 97530.";
    expect(scanPHI(text)).toEqual([]);
  });
});
