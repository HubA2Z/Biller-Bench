import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, ne, or, sql, count, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { isStaff } from "./auth";

const { questions: Q, answers: A, users: U, votes: V } = schema;

/** Who may see which questions: public ones for everyone; private ones for the asker and staff. */
export function visibleTo(user: User | null): SQL {
  const paid = user ? or(ne(Q.status, "PENDING_PAYMENT"), eq(Q.authorId, user.id))! : ne(Q.status, "PENDING_PAYMENT");
  const base = and(eq(Q.removed, false), isStaff(user) ? ne(Q.status, "PENDING_PAYMENT") : paid)!;
  if (isStaff(user)) return base;
  const vis = user ? or(eq(Q.isPrivate, false), eq(Q.authorId, user.id))! : eq(Q.isPrivate, false);
  return and(base, vis, user ? or(eq(Q.hidden, false), eq(Q.authorId, user.id))! : eq(Q.hidden, false))!;
}

export type ListFilters = {
  q?: string; code?: string; payer?: string; state?: string; specialty?: string;
  status?: "all" | "answered" | "open" | "mine"; sort?: "recent" | "votes"; page?: number;
};
export const PAGE_SIZE = 20;

export async function listQuestions(f: ListFilters, user: User | null) {
  const conds: SQL[] = [visibleTo(user)];
  const term = f.q?.trim();
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(Q.title, like), ilike(Q.body, like), sql`${term.toUpperCase().replace(/^-/, "")} = ANY(${Q.codes})`, sql`${term.toUpperCase().replace(/^-/, "")} = ANY(${Q.modifiers})`)!);
  }
  if (f.code) {
    const c = f.code.trim().toUpperCase().replace(/^-/, "");
    conds.push(or(sql`${c} = ANY(${Q.codes})`, sql`${c} = ANY(${Q.modifiers})`)!);
  }
  if (f.payer) {
    const [g, n] = f.payer.split("|");
    conds.push(n ? and(eq(Q.payerGroup, g), eq(Q.payerName, n))! : eq(Q.payerGroup, g));
  }
  if (f.state) conds.push(eq(Q.state, f.state));
  if (f.specialty) conds.push(eq(Q.specialty, f.specialty));
  if (f.status === "answered") conds.push(inArray(Q.status, ["ANSWERED", "SOLVED"]));
  if (f.status === "open") conds.push(eq(Q.status, "OPEN"));
  if (f.status === "mine" && user) conds.push(eq(Q.authorId, user.id));

  const where = and(...conds);
  const page = Math.max(1, f.page ?? 1);
  const [rows, [{ total }]] = await Promise.all([
    db.select({
      q: Q,
      authorName: U.name, authorOrg: U.practiceName, authorVerified: U.npiVerifiedAt, authorPlan: U.plan,
      replies: sql<number>`(select count(*)::int from ${A} a where a.question_id = ${Q.id} and a.removed = false)`,
    }).from(Q).innerJoin(U, eq(U.id, Q.authorId)).where(where)
      .orderBy(f.sort === "votes" ? desc(Q.voteCount) : desc(Q.createdAt))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(Q).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getQuestion(where: SQL, user: User | null) {
  const [row] = await db.select({ q: Q, author: U }).from(Q).innerJoin(U, eq(U.id, Q.authorId))
    .where(and(where, visibleTo(user))).limit(1);
  if (!row) return null;
  const answers = await db.select({ a: A, author: U }).from(A).innerJoin(U, eq(U.id, A.authorId))
    .where(and(eq(A.questionId, row.q.id), eq(A.removed, false))).orderBy(asc(A.createdAt));
  const myVotes = user
    ? await db.select({ q: V.questionId, a: V.answerId }).from(V).where(and(eq(V.userId, user.id),
        or(eq(V.questionId, row.q.id), answers.length ? inArray(V.answerId, answers.map((x) => x.a.id)) : sql`false`)))
    : [];
  return {
    ...row,
    answers,
    voted: new Set(myVotes.flatMap((v) => [v.q, v.a]).filter(Boolean) as string[]),
  };
}

export function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function planQuestionsUsed(userId: string) {
  const [{ n }] = await db.select({ n: count() }).from(Q)
    .where(and(eq(Q.authorId, userId), eq(Q.tier, "PLAN"), gte(Q.createdAt, startOfMonth())));
  return n;
}

const STOP = new Set("a an the and or of on for to with in is it by at be are was do does our we my i how why what when which from as vs same".split(" "));
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\- ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));

/** "Did you mean" suggestions: public questions sharing codes or title words. */
export async function similarQuestions(title: string, codes: string[]) {
  const t = new Set([...tokens(title), ...codes.map((c) => c.toLowerCase())]);
  if (t.size < 2) return [];
  const words = [...t].filter((w) => !/^\d/.test(w)).slice(0, 6);
  const conds: SQL[] = [];
  if (codes.length) conds.push(sql`${Q.codes} && ${sql`ARRAY[${sql.join(codes.map((c) => sql`${c}`), sql`, `)}]::text[]`}`);
  for (const w of words) if (w.length > 3) conds.push(ilike(Q.title, `%${w}%`));
  if (!conds.length) return [];
  const rows = await db.select().from(Q)
    .where(and(eq(Q.isPrivate, false), eq(Q.removed, false), eq(Q.hidden, false), ne(Q.status, "PENDING_PAYMENT"), or(...conds)))
    .orderBy(desc(Q.voteCount)).limit(30);
  return rows.map((q) => {
    const qt = new Set([...tokens(q.title), ...q.codes.map((c) => c.toLowerCase()), ...q.modifiers.map((m) => m.toLowerCase())]);
    let s = 0;
    t.forEach((w) => { if (qt.has(w)) s += /\d/.test(w) ? 3 : 1; });
    return { q, s };
  }).filter((x) => x.s >= 3).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.q);
}
