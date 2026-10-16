/**
 * Turns pasted content into the Markdown our editor uses, so headings, bold,
 * lists, links and tables survive a copy and paste from Google Docs, Word,
 * web pages or chat apps. Runs in the browser only.
 */
import TurndownService from "turndown";

let service: TurndownService | null = null;

function turndown(): TurndownService {
  if (service) return service;
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", emDelimiter: "*", strongDelimiter: "**", codeBlockStyle: "fenced", hr: "---" });
  // Our renderer shows text literally, so don't add backslash escapes ("1\." or "\-").
  td.escape = (s: string) => s;
  td.remove(["script", "style", "meta", "link", "title", "head", "noscript", "iframe", "img", "button"]);

  const styleOf = (n: Node) => ((n as HTMLElement).getAttribute?.("style") ?? "").toLowerCase();
  // Google Docs wraps everything in <b style="font-weight:normal">: don't make the whole paste bold.
  td.addRule("notReallyBold", {
    filter: (n) => (n.nodeName === "B" || n.nodeName === "STRONG") && /font-weight:\s*(normal|[1-4]00)/.test(styleOf(n)),
    replacement: (content) => content,
  });
  // Google Docs and Word mark bold and italic with styles on <span>.
  td.addRule("styledSpan", {
    filter: (n) => n.nodeName === "SPAN" && /font-weight:\s*(bold|[6-9]00)|font-style:\s*italic/.test(styleOf(n)),
    replacement: (content, n) => {
      const t = content.trim();
      if (!t) return content;
      const st = styleOf(n);
      const bold = /font-weight:\s*(bold|[6-9]00)/.test(st), italic = /font-style:\s*italic/.test(st);
      const wrapped = bold && italic ? `***${t}***` : bold ? `**${t}**` : `*${t}*`;
      return content.replace(t, wrapped);
    },
  });
  // Links without a real web address (anchors, javascript:) become plain text.
  td.addRule("plainLinks", {
    filter: (n) => n.nodeName === "A" && !/^https?:\/\//i.test((n as HTMLElement).getAttribute("href") ?? ""),
    replacement: (content) => content,
  });
  // Any table becomes a pipe table, using the first row as the header.
  td.addRule("table", {
    filter: "table",
    replacement: (_c, node) => {
      const rows = Array.from((node as HTMLTableElement).querySelectorAll("tr")).map((tr) =>
        Array.from(tr.querySelectorAll("th,td")).map((c) => (c.textContent ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").trim()));
      if (!rows.length) return "";
      const width = Math.max(...rows.map((r) => r.length));
      const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? "").join(" | ")} |`;
      return `\n\n${line(rows[0])}\n|${" --- |".repeat(width)}\n${rows.slice(1).map(line).join("\n")}\n\n`;
    },
  });
  service = td;
  return td;
}

/** Normalizes plain text: bullet characters to "- ", odd spaces removed, extra blank lines collapsed. */
export function tidyText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+$/, "")
      // Bullet characters from Word, Google Docs and chat apps: •, ●, ▪, ◦, ‣, ⁃, ∙, ·, ■ and Word's symbol bullet.
      .replace(/^(\s*)[•●▪◦‣⁃∙·■]\s*/, "$1- ")
      // Word's second-level "o" bullet.
      .replace(/^(\s*)o\s{2,}/, "$1  - ")
      // "-   item" or "1.  item" becomes "- item" / "1. item".
      .replace(/^(\s*)([-*+]|\d{1,3}[.)])\s{2,}/, "$1$2 ")
      // No bold markers inside headings.
      .replace(/^(#{1,6} )\*\*(.+)\*\*$/, "$1$2"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToMarkdown(html: string): string {
  const body = html.replace(/<!--[\s\S]*?-->/g, "").replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  return tidyText(turndown().turndown(body));
}

/**
 * A paste handler for a controlled textarea. Rich content is converted to
 * Markdown; plain text is tidied. Returns false when nothing was handled.
 */
export function handleMarkdownPaste(e: React.ClipboardEvent<HTMLTextAreaElement>, value: string, setValue: (v: string) => void): boolean {
  const html = e.clipboardData.getData("text/html");
  const text = e.clipboardData.getData("text/plain");
  const converted = html && /<(h[1-6]|p|ul|ol|li|table|strong|b|em|a|br|div)\b/i.test(html) ? htmlToMarkdown(html) : text ? tidyText(text) : "";
  if (!converted) return false;
  e.preventDefault();
  const el = e.currentTarget;
  const start = el.selectionStart, end = el.selectionEnd;
  const next = value.slice(0, start) + converted + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + converted.length; });
  return true;
}
