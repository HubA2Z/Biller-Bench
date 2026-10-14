import "server-only";
import { and, asc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeCode } from "./denials";

const D = schema.denialCodes;
const Q = schema.questions;

export async function listPublishedDenials(term?: string) {
  const t = term?.trim();
  const conds = [eq(D.status, "PUBLISHED")];
  if (t) {
    const bare = normalizeCode(t.replace(/^(co|pr|oa|pi|carc)[\s-]?/i, ""));
    const like = `%${t.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(eq(D.code, bare), ilike(D.title, like), ilike(D.quickAnswer, like), ilike(D.body, like))!);
  }
  return db.select({ code: D.code, groupCode: D.groupCode, slug: D.slug, category: D.category, title: D.title, quickAnswer: D.quickAnswer })
    .from(D).where(and(...conds)).orderBy(asc(D.category), sql`length(${D.code})`, asc(D.code));
}

/** Published pages for a list of codes, in the order given. */
export async function publishedDenialsFor(codes: string[]) {
  if (!codes.length) return [];
  const rows = await db.select({ code: D.code, groupCode: D.groupCode, slug: D.slug, title: D.title })
    .from(D).where(and(eq(D.status, "PUBLISHED"), inArray(D.code, codes)));
  return codes.map((c) => rows.find((r) => r.code === c)).filter((r): r is NonNullable<typeof r> => Boolean(r));
}

/** Public, answered questions that mention this denial code (CO-97, PR 97, CARC 97, denial code 97). */
export async function questionsMentioning(code: string, limit = 6) {
  if (!/^[A-Z]?\d{1,3}$/.test(code)) return [];
  const pattern = `(\\m(co|pr|oa|pi)[- ]?|\\mcarc ?#?|denial code #?)0*${code.toLowerCase()}\\M`;
  return db.select().from(Q).where(and(
    eq(Q.isPrivate, false), eq(Q.removed, false), eq(Q.hidden, false), ne(Q.status, "PENDING_PAYMENT"), ne(Q.status, "OPEN"),
    sql`(${Q.title} ~* ${pattern} or ${Q.body} ~* ${pattern})`,
  )).orderBy(sql`${Q.voteCount} desc`).limit(limit);
}
