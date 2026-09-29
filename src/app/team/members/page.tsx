import type { Metadata } from "next";
import Link from "next/link";
import { asc, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/sla";
import { resendInvite, setMemberActive } from "@/app/actions/team-members";
import { MemberForm } from "@/components/MemberForm";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Team members", robots: { index: false } };

export default async function Members() {
  const me = await requireAdmin();
  const U = schema.users;
  const uid = sql.raw(`"users"."id"`);
  const rows = await db.select({
    u: U,
    answers: sql<number>`(select count(*)::int from answers a where a.author_id = ${uid} and a.type = 'EXPERT' and a.removed = false)`,
  }).from(U).where(inArray(U.role, ["STAFF", "ADMIN"])).orderBy(sql`${U.disabledAt} is not null`, asc(U.name));

  return (
    <>
      <Link className="back" href="/team">← Team queue</Link>
      <div className="pagehead"><span className="eyebrow">Admin</span><h1>Team members</h1>
        <p className="muted small" style={{ margin: 0 }}>Billers answer questions and work the queue. Admins can also add and manage billers.</p></div>

      <div className="tablewrap"><table>
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th className="num">Answers</th><th></th></tr></thead>
        <tbody>{rows.map(({ u, answers }) => {
          const status = u.disabledAt ? "Turned off" : u.lastLoginAt ? `Active · last sign-in ${timeAgo(u.lastLoginAt)}` : "Invited, hasn’t signed in";
          return (
            <tr key={u.id} style={u.disabledAt ? { opacity: 0.6 } : undefined}>
              <td style={{ minWidth: 200 }}><strong>{u.name}</strong>{u.credentials && <span className="muted">, {u.credentials}</span>}<div className="small muted">{u.email}</div></td>
              <td>{u.role === "ADMIN" ? "Admin" : "Biller"}</td>
              <td className="small">{status}</td>
              <td className="num">{answers}</td>
              <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Link className="btn sm ghost" href={`/team/members/${u.id}`}>Edit</Link>
                {!u.lastLoginAt && !u.disabledAt && (
                  <form action={resendInvite}><input type="hidden" name="userId" value={u.id} /><SubmitButton className="btn sm ghost" pendingText="Sending…">Resend invite</SubmitButton></form>)}
                {u.id !== me.id && (
                  <form action={setMemberActive}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="active" value={u.disabledAt ? "true" : "false"} />
                    <SubmitButton className="btn sm ghost" pendingText="Saving…">{u.disabledAt ? "Turn on" : "Turn off"}</SubmitButton></form>)}
              </div></td>
            </tr>);
        })}</tbody>
      </table></div>
      <p className="hint">Turning someone off signs them out right away and stops their alerts. Their past answers stay on the site.</p>

      <section className="section"><h2>Add a biller</h2>
        <div className="card" style={{ maxWidth: 760 }}><MemberForm /></div></section>
    </>
  );
}
