import { describe, expect, it } from "vitest";
import { classifyCode, parseCodes } from "@/lib/codes";
import { isValidNpi, npiMatchesAccount } from "@/lib/npi";
import { renderMarkdown } from "@/lib/markdown";
import { questionPath } from "@/lib/paths";

describe("codes", () => {
  it("classifies CPT, HCPCS and ICD-10", () => {
    expect(["99214", "0591T", "G2211", "M17.11", "F41.1", "ABC"].map(classifyCode)).toEqual(["CPT", "CPT", "HCPCS", "ICD-10", "ICD-10", null]);
  });
  it("parses and de-duplicates a code list", () => {
    expect(parseCodes("99214, 20610; m17.11 99214")).toEqual(["99214", "20610", "M17.11"]);
  });
});

describe("NPI", () => {
  it("checks the Luhn check digit", () => {
    expect(isValidNpi("1234567893")).toBe(true);
    expect(isValidNpi("1234567890")).toBe(false);
    expect(isValidNpi("12345")).toBe(false);
  });
  it("matches the registry last name to the account", () => {
    const rec = { npi: "1234567893", type: "NPI-1" as const, name: "PRIYA RAMAN", lastName: "RAMAN" };
    expect(npiMatchesAccount(rec, "Dr. Priya Raman")).toBe(true);
    expect(npiMatchesAccount(rec, "Someone Else")).toBe(false);
  });
});

describe("markdown", () => {
  it("escapes HTML and only allows http(s) links", () => {
    const html = renderMarkdown('<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://cms.gov)');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('href="https://cms.gov"');
  });
});

describe("questionPath", () => {
  const base = { id: "abc", slug: "why-99214-denies-1a2b3c", codes: ["99214"], modifiers: ["25"], payerGroup: "Medicare", payerName: "Novitas JL", isPrivate: false };
  it("builds the SEO path for public questions", () => {
    expect(questionPath(base)).toBe("/q/99214/medicare-novitas-jl/why-99214-denies-1a2b3c");
  });
  it("uses an ID path for private questions", () => {
    expect(questionPath({ ...base, isPrivate: true })).toBe("/p/abc");
  });
});
