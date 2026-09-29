import type { Question, User } from "@/db/schema";
import { classifyCode } from "@/lib/codes";
import { payerLabel } from "@/lib/taxonomy";
import { PLANS } from "@/lib/plans";
import { formatDuration } from "@/lib/sla";

export function Icon({ name }: { name: "up" | "check" | "shield" | "lock" }) {
  const paths = {
    up: <path d="M12 5l7 8h-4.5v6h-5v-6H5z" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />,
    shield: <><path d="M12 2.5l8 3v6c0 5-3.4 8.8-8 10-4.6-1.2-8-5-8-10v-6z" /><path d="M8 12l3 3 5-6" fill="none" stroke="var(--surface)" strokeWidth={2.2} /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth={2} /></>,
  };
  return <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true">{paths[name]}</svg>;
}

export function QuestionChips({ q }: { q: Question }) {
  return (
    <>
      {q.codes.map((c) => <span key={c} className="chip code" title={classifyCode(c) ?? "Code"}>{c}</span>)}
      {q.modifiers.map((m) => <span key={m} className="chip mod">-{m}</span>)}
      <span className="chip payer">{payerLabel(q.payerGroup, q.payerName)}</span>
      <span className="chip spec">{q.specialty}</span>
      {q.ehr && <span className="chip ehr">{q.ehr}</span>}
    </>
  );
}

export function TierChips({ q, authorPlan }: { q: Question; authorPlan?: User["plan"] }) {
  return (
    <>
      {q.tier === "URGENT" && <span className="chip urgent">Urgent · 4h</span>}
      {q.tier === "PLAN" && <span className="chip planchip">{authorPlan ? PLANS[authorPlan].name : "Plan"}</span>}
      {q.isPrivate && <span className="chip private">Private</span>}
    </>
  );
}

export function Badge({ user }: { user: Pick<User, "role" | "npiVerifiedAt" | "credentials"> }) {
  if (user.role !== "PROVIDER") return <span className="badge v"><Icon name="shield" />BillerBench expert</span>;
  return user.npiVerifiedAt ? <span className="badge v"><Icon name="shield" />Verified Provider</span> : <span className="badge p">NPI not verified</span>;
}

/** The answer-deadline line shown on lists and question pages. */
export function slaText(q: Question, now = new Date()): { text: string; cls: string } {
  if (q.status === "PENDING_PAYMENT") return { text: "Waiting for payment", cls: "late" };
  if (q.firstAnsweredAt) return { text: `Answered in ${formatDuration(q.firstAnsweredAt.getTime() - q.createdAt.getTime())}`, cls: "done" };
  if (!q.dueAt) return { text: "Waiting for an answer", cls: "" };
  const left = q.dueAt.getTime() - now.getTime();
  const prefix = q.tier === "FREE" ? "Free queue · " : "";
  if (left < 0) return { text: `${prefix}Overdue by ${formatDuration(-left)}`, cls: "late" };
  return { text: `${prefix}Due in ${formatDuration(left)}`, cls: left < 3600_000 ? "late" : "" };
}
