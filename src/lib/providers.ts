import "server-only";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const U = schema.users, Q = schema.questions, S = schema.serviceRequests;
/** The built-in account that owns team and reader Q&As isn't a real provider. */
export const SYSTEM_EMAIL = "questions@billerbench.system";

/** Provider accounts with question and service-request counts, newest first. */
export async function listProviders(term?: string) {
  const t = term?.trim();
  const like = t ? `%${t.replace(/[%_\\]/g, "\\$&")}%` : null;
  return db.select({
    u: U,
    questions: sql<number>`(select count(*)::int from ${Q} q where q.author_id = "users"."id" and q.removed = false)`,
    openQuestions: sql<number>`(select count(*)::int from ${Q} q where q.author_id = "users"."id" and q.removed = false and q.status = 'OPEN')`,
    requests: sql<number>`(select count(*)::int from ${S} s where s.user_id = "users"."id")`,
  }).from(U)
    .where(and(eq(U.role, "PROVIDER"), ne(U.email, SYSTEM_EMAIL),
      like ? or(ilike(U.name, like), ilike(U.email, like), ilike(U.practiceName, like), ilike(U.npi, like), ilike(U.state, like), ilike(U.specialty, like)) : undefined))
    .orderBy(desc(U.createdAt)).limit(1000);
}

export async function getProvider(id: string) {
  const [u] = await db.select().from(U).where(and(eq(U.id, id), eq(U.role, "PROVIDER")));
  if (!u || u.email === SYSTEM_EMAIL) return null;
  const [questions, requests] = await Promise.all([
    db.select({
      q: Q,
      replies: sql<number>`(select count(*)::int from ${schema.answers} a where a.question_id = "questions"."id" and a.removed = false)`,
      expert: sql<number>`(select count(*)::int from ${schema.answers} a where a.question_id = "questions"."id" and a.removed = false and a.type = 'EXPERT')`,
    }).from(Q).where(eq(Q.authorId, u.id)).orderBy(desc(Q.createdAt)),
    db.select().from(S).where(eq(S.userId, u.id)).orderBy(desc(S.createdAt)),
  ]);
  return { u, questions, requests };
}
