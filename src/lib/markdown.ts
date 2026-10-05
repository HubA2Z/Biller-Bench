/**
 * Small, safe Markdown renderer. Everything is HTML-escaped first; only
 * headings (##, ###), bold, italics, inline code, http(s) links, bullet and
 * numbered lists, and quotes are turned back into markup.
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

export function renderMarkdown(src: string): string {
  // Give every heading line its own block, even without blank lines around it.
  const prepared = src.replace(/\r/g, "").replace(/^(#{1,3} .*)$/gm, "\n$1\n").trim();
  return prepared.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((block) => {
    const lines = block.split("\n");
    const h = block.match(/^(#{1,3}) (.+)$/);
    if (h && lines.length === 1) {
      const tag = h[1].length === 3 ? "h3" : "h2"; // the page title is the only h1
      return `<${tag}>${inline(h[2])}</${tag}>`;
    }
    if (lines.every((l) => /^\s*\d+[.)] /.test(l))) return "<ol>" + lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)] /, ""))}</li>`).join("") + "</ol>";
    if (lines.every((l) => /^\s*[-*] /.test(l))) return "<ul>" + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("") + "</ul>";
    if (lines.every((l) => /^> ?/.test(l))) return `<blockquote>${inline(lines.map((l) => l.replace(/^> ?/, "")).join(" "))}</blockquote>`;
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}

export const plainText = (src: string) =>
  src.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*`>#-]/g, "").replace(/\s+/g, " ").trim();
