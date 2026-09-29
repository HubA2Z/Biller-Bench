import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Question } from "@/db/schema";
import { appUrl } from "./stripe";
import { questionPath } from "./paths";
import { sendEmailSafe } from "./email";
import { SERVICES } from "./plans";

const { users: U } = schema;

/** Private question titles can hold PHI, so emails name them generically. */
const label = (q: Question) => (q.isPrivate ? "your private question" : `“${q.title}”`);
const link = (q: Question) => appUrl() + questionPath(q);

async function staffEmails(): Promise<string[]> {
  if (process.env.STAFF_ALERT_EMAILS) return process.env.STAFF_ALERT_EMAILS.split(",").map((s) => s.trim()).filter(Boolean);
  const rows = await db.select({ email: U.email }).from(U)
    .where(and(inArray(U.role, ["STAFF", "ADMIN"]), eq(U.emailNotifications, true), isNull(U.disabledAt)));
  return rows.map((r) => r.email);
}

async function recipient(userId: string) {
  const [u] = await db.select().from(U).where(eq(U.id, userId));
  return u && u.emailNotifications ? u : null;
}

/** Tell the asker that our team replied. */
export async function notifyAskerOfReply(q: Question, type: "EXPERT" | "FOLLOWUP") {
  const u = await recipient(q.authorId);
  if (!u) return;
  const expert = type === "EXPERT";
  await sendEmailSafe({
    to: u.email,
    subject: expert ? "Your billing question has an answer" : "Our team needs a detail on your question",
    text: expert
      ? `Hi ${u.name},\n\nA certified biller on our team answered ${label(q)}.\n\nRead the answer: ${link(q)}\n\nIf it solved the problem, mark it as the solution so other practices can find it.`
      : `Hi ${u.name},\n\nOne of our billers asked a follow-up on ${label(q)}. Reply on the question page so we can finish the answer:\n\n${link(q)}`,
  });
}

/** Tell the team a paid question is waiting, or that an asker replied. */
export async function notifyStaffOfQuestion(q: Question, event: "new" | "followup") {
  if (event === "new" && q.tier === "FREE") return; // free questions are picked up from the queue
  const to = await staffEmails();
  if (!to.length) return;
  const due = q.dueAt ? q.dueAt.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }) + " ET" : "soon";
  const kind = q.tier === "URGENT" ? "Urgent" : q.tier === "PLAN" ? "Plan" : "Free";
  await sendEmailSafe({
    to,
    subject: event === "new" ? `[${kind}] New question due ${due}` : `Asker replied: ${q.isPrivate ? "private question" : q.title}`.slice(0, 120),
    text: event === "new"
      ? `A ${kind.toLowerCase()} question is in the queue, due ${due}.\n\n${q.payerGroup} · ${q.payerName} · ${q.specialty}\n\nOpen it: ${link(q)}`
      : `The asker added a follow-up. Open the question: ${link(q)}`,
  });
}

export async function notifyStaffOfLead(lead: { service: string; practiceName: string; contactName: string; email: string; claimsPerMonth: string | null }) {
  const to = await staffEmails();
  if (!to.length) return;
  const name = SERVICES.find((s) => s.id === lead.service)?.name ?? lead.service;
  await sendEmailSafe({
    to,
    subject: `New service request: ${name} from ${lead.practiceName}`.slice(0, 120),
    text: `${lead.practiceName} asked about ${name}.\n\nContact: ${lead.contactName} <${lead.email}>${lead.claimsPerMonth ? `\nClaims per month: ${lead.claimsPerMonth}` : ""}\n\nSee all requests: ${appUrl()}/team`,
  });
}

export async function sendPasswordReset(email: string, name: string, token: string) {
  await sendEmailSafe({
    to: email,
    subject: "Reset your BillerBench password",
    text: `Hi ${name},\n\nUse this link to choose a new password. It works once and expires in one hour:\n\n${appUrl()}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.`,
  });
}

export async function sendPasswordChanged(email: string, name: string) {
  await sendEmailSafe({
    to: email,
    subject: "Your BillerBench password was changed",
    text: `Hi ${name},\n\nYour password was just changed and you were signed out on other devices.\n\nIf this wasn't you, reset your password now: ${appUrl()}/forgot-password`,
  });
}

export async function sendTeamInvite(email: string, name: string, invitedBy: string, token: string) {
  await sendEmailSafe({
    to: email,
    subject: "You've been added to the BillerBench team",
    text: `Hi ${name},\n\n${invitedBy} added you to the BillerBench team, so you can answer billing questions from practices.\n\nSet your password to get started. This link works once and expires in 7 days:\n\n${appUrl()}/reset-password?token=${token}&invite=1\n\nAfter that, sign in at ${appUrl()}/login and open the team queue.`,
  });
}
