/**
 * Small, safe Markdown renderer. Everything is HTML-escaped first; only
 * headings, bold, italics, inline code, http(s) links, bullet and numbered
 * lists (nested by indenting), tables, quotes and dividers become markup.
 */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function inline(t: string) {
  return escapeHtml(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)"]+)\)/g, '<a href="$2" target="_blank" rel="noopener nofollow ugc">$1</a>');
}

/** Bullet markers people paste in: -, *, +, and the bullet characters Word, Google Docs and chat apps use. */
const BULLET = /^(\s*)(?:[-*+]|[\u2022\u25CF\u25AA\u25E6\u2023\u2043\u2219\u00B7\u25A0\u2013])\s+(.*)$/;
const NUMBERED = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const indentOf = (s: string) => s.replace(/\t/g, "  ").length;

/**
 * Line-based renderer, forgiving about blank lines: a list or heading directly
 * under a paragraph still renders as a list or heading, lists can nest by
 * indenting, and "1)" or "•" style lists from pasted text work.
 */
export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r/g, "").replace(/\u00A0/g, " ").split("\n").map((l) => l.replace(/\s+$/, ""));
  const out: string[] = [];
  let para: string[] = [];
  const lists: { tag: "ul" | "ol"; indent: number }[] = [];
  let liOpen = false;

  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const closeLists = (toDepth = 0) => {
    while (lists.length > toDepth) { if (liOpen) { out.push("</li>"); } out.push(`</${lists.pop()!.tag}>`); liOpen = lists.length > 0; }
    if (!lists.length) liOpen = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flushPara(); continue; }

    // Tables: a header row, a separator row, then body rows.
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      flushPara(); closeLists();
      const cells = (l: string) => l.trim().slice(1, -1).split("|").map((c) => inline(c.trim()));
      const head = cells(line).map((c) => `<th>${c}</th>`).join("");
      const rows: string[] = [];
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(`<tr>${cells(lines[i]).map((c) => `<td>${c}</td>`).join("")}</tr>`); i++; }
      i--;
      out.push(`<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`);
      continue;
    }
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*$/);
    if (h) {
      flushPara(); closeLists();
      const tag = h[1].length <= 2 ? "h2" : "h3"; // the page title is the only h1
      out.push(`<${tag}>${inline(h[2])}</${tag}>`);
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { flushPara(); closeLists(); out.push("<hr>"); continue; }
    if (/^\s*> ?/.test(line)) {
      flushPara(); closeLists();
      const q: string[] = [];
      while (i < lines.length && /^\s*> ?/.test(lines[i])) { q.push(lines[i].replace(/^\s*> ?/, "")); i++; }
      i--;
      out.push(`<blockquote>${q.map(inline).join("<br>")}</blockquote>`);
      continue;
    }

    const b = line.match(BULLET), n = b ? null : line.match(NUMBERED);
    if (b || n) {
      flushPara();
      const indent = indentOf((b ?? n)![1]);
      const tag = b ? "ul" : "ol";
      const text = b ? b[2] : n![3];
      // Close deeper lists, or a list of the other kind at the same depth.
      while (lists.length && (indent < lists[lists.length - 1].indent || (indent === lists[lists.length - 1].indent && lists[lists.length - 1].tag !== tag))) closeLists(lists.length - 1);
      const top = lists[lists.length - 1];
      if (!top || indent > top.indent) {
        if (liOpen === false && top) out.push("<li>");
        const startAttr = tag === "ol" && Number(n![2]) > 1 ? ` start="${Number(n![2])}"` : "";
        out.push(`<${tag}${startAttr}>`);
        lists.push({ tag, indent });
      } else if (liOpen) out.push("</li>");
      out.push(`<li>${inline(text)}`);
      liOpen = true;
      continue;
    }
    // An indented line right after a list item continues that item.
    if (lists.length && liOpen && indentOf(line.match(/^\s*/)![0]) > 0) { out.push(`<br>${inline(line.trim())}`); continue; }
    closeLists();
    para.push(line.trim());
  }
  flushPara(); closeLists();
  return out.join("");
}

export const plainText = (src: string) =>
  src.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*`>#-]/g, "").replace(/\s+/g, " ").trim();
