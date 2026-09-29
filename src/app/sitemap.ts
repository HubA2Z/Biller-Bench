import type { MetadataRoute } from "next";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { questionPath } from "@/lib/paths";
import { appUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const Q = schema.questions;
  const rows = await db.select().from(Q)
    .where(and(eq(Q.isPrivate, false), eq(Q.removed, false), eq(Q.hidden, false), ne(Q.status, "PENDING_PAYMENT"), ne(Q.status, "OPEN")))
    .orderBy(desc(Q.updatedAt)).limit(45000);
  const base = appUrl();
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly" },
    { url: `${base}/experts`, changeFrequency: "monthly" },
    ...rows.map((q) => ({ url: base + questionPath(q), lastModified: q.updatedAt, changeFrequency: "weekly" as const })),
  ];
}
