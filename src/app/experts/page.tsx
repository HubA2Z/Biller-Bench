import type { Metadata } from "next";
import { and, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDuration } from "@/lib/sla";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Our experts", description: "The certified medical billers who answer every BillerBench question." };
export const dynamic = "force-dynamic";

export default async function Experts() {
  const U = schema.users;
  const uid = sql.raw(`"users"."id"`);
  const staff = await db.select({
    u: U,
    answers: sql<number>`(select count(*)::int from answers a where a.author_id = ${uid} and a.type = 'EXPERT' and a.removed = false)`,
    solutions: sql<number>`(select count(*)::int from questions q join answers a on a.id = q.accepted_answer_id where a.author_id = ${uid})`,
    medianMs: sql<number | null>`(select percentile_cont(0.5) within group (order by extract(epoch from (q.first_answered_at - q.created_at)) * 1000)
      from questions q where q.first_answered_at is not null
      and (select a.author_id from answers a where a.question_id = q.id and a.type = 'EXPERT' order by a.created_at limit 1) = ${uid})`,
  }).from(U).where(and(inArray(U.role, ["STAFF", "ADMIN"]), isNull(U.disabledAt))).orderBy(U.name);

  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">Our team</span>
        <h1>Every answer comes from a certified biller on our staff</h1>
        <p className="muted" style={{ maxWidth: "64ch", margin: 0 }}>No anonymous forum replies. Each answer cites the rule or payer policy behind it.</p>
      </div>
      <div className="team">
        {staff.map(({ u, answers, solutions, medianMs }) => (
          <div key={u.id} className="card">
            <h3 style={{ fontSize: 16 }}>{u.name}{u.credentials && <span className="muted">, {u.credentials}</span>}</h3>
            <div><Badge user={u} /></div>
            <div className="chips">{u.expertSpecialties.map((s) => <span key={s} className="chip spec">{s}</span>)}</div>
            <div className="small muted">Payers: {u.expertPayers.join(", ") || "All"}<br />Software: {u.expertEhr.join(", ") || "Most major systems"}</div>
            <div className="kv"><div><strong>{answers}</strong>answers</div><div><strong>{solutions}</strong>solutions</div><div><strong>{medianMs != null ? formatDuration(Number(medianMs)) : "–"}</strong>median reply</div></div>
          </div>
        ))}
        {!staff.length && <div className="empty">No team members yet. Run <code>npm run make-staff</code>.</div>}
      </div>
    </>
  );
}
