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

describe("forgiving markdown", () => {
  const r = renderMarkdown;
  it("renders a list right under a paragraph", () => {
    expect(r("Key rules:\n- One\n- Two")).toBe("<p>Key rules:</p><ul><li>One</li><li>Two</li></ul>");
  });
  it("accepts pasted bullet characters and 1) numbering", () => {
    expect(r("• First\n• Second")).toBe("<ul><li>First</li><li>Second</li></ul>");
    expect(r("1) Call\n2) Appeal")).toBe("<ol><li>Call</li><li>Appeal</li></ol>");
  });
  it("nests indented lists", () => {
    expect(r("- Parent\n  - Child\n- Next")).toBe("<ul><li>Parent<ul><li>Child</li></ul></li><li>Next</li></ul>");
  });
  it("keeps numbering across a sub-list separated by blank lines", () => {
    expect(r("1. A\n2. B\n\n- x\n\n3. C")).toBe('<ol><li>A</li><li>B</li></ol><ul><li>x</li></ul><ol start="3"><li>C</li></ol>');
  });
  it("renders headings and dividers without blank lines", () => {
    expect(r("Intro\n## Title\ntext\n---\nmore")).toBe("<p>Intro</p><h2>Title</h2><p>text</p><hr><p>more</p>");
    expect(r("#### Small")).toBe("<h3>Small</h3>");
  });
  it("still escapes HTML", () => {
    expect(r("- <script>x</script>")).toBe("<ul><li>&lt;script&gt;x&lt;/script&gt;</li></ul>");
  });
});

import { tidyText } from "../src/lib/paste";
describe("tidyText", () => {
  it("cleans pasted text", () => {
    expect(tidyText("Rules:\r\n•  One  \n· Two\n\n\n\n#  x")).toBe("Rules:\n- One\n- Two\n\n#  x");
    expect(tidyText("-   a\n    -   b\n1.  c")).toBe("- a\n    - b\n1. c");
    expect(tidyText("# **Title**")).toBe("# Title");
  });
});

import { denialSeoDescription, denialSeoTitle } from "../src/lib/denials";
describe("denial SEO text", () => {
  it("builds titles and descriptions from the official label", () => {
    const d = { groupCode: "CO", code: "216", title: "x", quickAnswer: "y" };
    expect(denialSeoTitle(d)).toBe("CO-216 Denial Code Description: Based on Findings of a Review Organization");
    const desc = denialSeoDescription(d);
    expect(desc.startsWith("CO-216: Based on Findings of a Review Organization.")).toBe(true);
    expect(desc.length).toBeLessThanOrEqual(158);
    expect(denialSeoTitle({ groupCode: "CO", code: "999", title: "Fallback" })).toBe("Fallback");
  });
});
