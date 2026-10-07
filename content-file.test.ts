import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseUpdateFile } from "@/lib/content-file";

describe("parseUpdateFile", () => {
  it("parses the template", () => {
    const r = parseUpdateFile(readFileSync("content/updates/_TEMPLATE.md", "utf8"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.update.kind).toBe("CODING_UPDATE");
      expect(r.update.codes).toEqual(["G2211", "99214", "G0008"]);
      expect(r.update.payers).toEqual(["Medicare"]);
      expect(r.update.effectiveDate?.toISOString().slice(0, 10)).toBe("2025-01-01");
      expect(r.update.wantsPublish).toBe(false);
      expect(r.update.body.startsWith("## What changed")).toBe(true);
    }
  });
  it("rejects bad codes, payers and patient details", () => {
    const r = parseUpdateFile(`---\ntitle: A title that is long enough\nsummary: A summary that is definitely long enough to pass.\ncodes: 99214, ABC\npayers: Medicare, Acme Health\n---\nPatient Mrs. Johnson DOB 04/12/1961 was seen and this body is long enough to pass the length check here.`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/ABC.*Acme Health.*patient identifiers/s);
  });
  it("rejects a file without a header", () => {
    expect(parseUpdateFile("## Just a body").ok).toBe(false);
  });
});
