import type { Question } from "@/db/schema";
import { slugify } from "./slug";
import { payerLabel } from "./taxonomy";

/** Public questions get a search-friendly URL; private ones a plain ID URL. */
export function questionPath(q: Pick<Question, "id" | "slug" | "codes" | "modifiers" | "payerGroup" | "payerName" | "isPrivate">) {
  if (q.isPrivate) return `/p/${q.id}`;
  const code = (q.codes[0] ?? `mod-${q.modifiers[0] ?? "general"}`).toLowerCase();
  return `/q/${slugify(code, 20)}/${slugify(payerLabel(q.payerGroup, q.payerName), 40)}/${q.slug}`;
}
