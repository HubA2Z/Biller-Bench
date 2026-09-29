import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { layout } from "@/lib/email";

describe("email layout", () => {
  it("escapes content and links URLs", () => {
    const html = layout("Title <b>", "Hi <script>x</script>\n\nOpen https://example.com/q/1");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Title &lt;b&gt;");
    expect(html).toContain('<a href="https://example.com/q/1"');
  });
});
