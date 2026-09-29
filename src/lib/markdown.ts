/**
 * Small, safe Markdown renderer. Everything is HTML-escaped first; only
 * bold, italics, inline code, http(s) links, bullet lists and quotes are
 * turned back into markup.
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
  return src.trim().split(/\n{2,}/).map((block) => {
    const lines = block.split("\n");
    if (lines.every((l) => /^\s*[-*] /.test(l))) return "<ul>" + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("") + "</ul>";
    if (lines.every((l) => /^> ?/.test(l))) return `<blockquote>${inline(lines.map((l) => l.replace(/^> ?/, "")).join(" "))}</blockquote>`;
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}

export const plainText = (src: string) =>
  src.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*`>#-]/g, "").replace(/\s+/g, " ").trim();
