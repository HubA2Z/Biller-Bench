import type { Article } from "@/db/schema";

export const ARTICLE_KINDS = {
  ARTICLE: { label: "Article", plural: "Articles" },
  CODING_UPDATE: { label: "Coding update", plural: "Coding updates" },
  PAYER_UPDATE: { label: "Payer update", plural: "Payer updates" },
} as const;
export type ArticleKind = keyof typeof ARTICLE_KINDS;

export const articlePath = (a: Pick<Article, "slug">) => `/updates/${a.slug}`;

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
