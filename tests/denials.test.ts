import { describe, expect, it } from "vitest";
import { codeFromParam, denialSlug, mentionedCodes, parseDenialFile } from "../src/lib/denials";
import { renderMarkdown } from "../src/lib/markdown";

describe("denial codes", () => {
  it("reads codes from page addresses", () => {
    expect(codeFromParam("co-97")).toBe("97");
    expect(codeFromParam("97")).toBe("97");
    expect(codeFromParam("PR-1")).toBe("1");
    expect(codeFromParam("co-b7")).toBe("B7");
    expect(codeFromParam("co97")).toBe("97");
    expect(codeFromParam("hello")).toBeNull();
    expect(codeFromParam("co-1234")).toBeNull();
  });
  it("builds slugs", () => {
    expect(denialSlug("CO", "97")).toBe("co-97");
    expect(denialSlug("PR", "001")).toBe("pr-1");
  });
  it("finds codes mentioned in questions", () => {
    expect(mentionedCodes("Medicare denial CO-97 on 99214, then PR 204 and CARC 16")).toEqual(["97", "204", "16"]);
    expect(mentionedCodes("denial code 50 for 20610")).toEqual(["50"]);
    expect(mentionedCodes("99214 with modifier 25")).toEqual([]);
  });
  it("parses a content file", () => {
    const body = "## What it means\n\n" + "Text. ".repeat(80);
    const r = parseDenialFile(`---\ncode: 97\ngroup: CO\ncategory: coding\nquick_answer: ${"The payer says this service is included in another service. ".repeat(2)}\nrelated: 4, 236, 97\n---\n${body}`);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.denial.slug).toBe("co-97"); expect(r.denial.related).toEqual(["4", "236"]); expect(r.denial.title).toMatch(/^CO-97 Denial Code/); }
    const bad = parseDenialFile("---\ncode: 97\ncategory: nope\n---\nshort");
    expect(bad.ok).toBe(false);
  });
});

describe("markdown tables", () => {
  it("renders a pipe table and escapes cells", () => {
    const html = renderMarkdown("| | Medicare | Commercial |\n|---|---|---|\n| Fix | Reopening | <b>Corrected</b> claim |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Medicare</th>");
    expect(html).toContain("&lt;b&gt;Corrected&lt;/b&gt; claim");
  });
});
