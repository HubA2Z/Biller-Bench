import type { MetadataRoute } from "next";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { questionPath } from "@/lib/paths";
import { appUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const Q = schema.questions;
  const rows = await db.select().from(Q)
    .where(and(eq(Q.isPrivate, false), eq(Q.removed, false), eq(Q.hidden, false), ne(Q.status, "PENDING_PAYMENT"), ne(Q.status, "OPEN")))
    .orderBy(desc(Q.updatedAt)).limit(45000);
  const base = appUrl();
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/services`, changeFrequency: "monthly" },
    { url: `${base}/experts`, changeFrequency: "monthly" },
    { url: `${base}/updates`, changeFrequency: "daily" },
    { url: `${base}/about`, changeFrequency: "monthly" },
    { url: `${base}/careers`, changeFrequency: "monthly" },
    { url: `${base}/contact`, changeFrequency: "yearly" },
    ...(await db.select({ slug: schema.articles.slug, updatedAt: schema.articles.updatedAt }).from(schema.articles)
      .where(eq(schema.articles.status, "PUBLISHED")).orderBy(desc(schema.articles.updatedAt)).limit(5000))
      .map((a) => ({ url: `${base}/updates/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const })),
    ...rows.map((q) => ({ url: base + questionPath(q), lastModified: q.updatedAt, changeFrequency: "weekly" as const })),
  ];
}
