"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { isStaff, requireUser } from "@/lib/auth";
import { scanPHI } from "@/lib/phi";
import { LIMITS, hit, waitMessage } from "@/lib/rate-limit";
import { notifyAskerOfReply, notifyStaffOfQuestion } from "@/lib/notify";

const { questions: Q, answers: A } = schema;

export type AnswerState = { error?: string; ok?: boolean } | undefined;

export async function postAnswer(_: AnswerState, form: FormData): Promise<AnswerState> {
  const user = await requireUser();
  const questionId = String(form.get("questionId"));
  const body = String(form.get("body") ?? "").trim();
  const path = String(form.get("path") ?? "/");
  const staff = isStaff(user);
  const type = staff && form.get("type") === "EXPERT" ? "EXPERT" : "FOLLOWUP";

  const [q] = await db.select().from(Q).where(and(eq(Q.id, questionId), eq(Q.removed, false)));
  if (!q) return { error: "This question no longer exists." };
  if (!staff && q.authorId !== user.id) return { error: "Only our team and the practice that asked can reply." };
  if (body.length < 20) return { error: "Write at least 20 characters." };
  if (body.length > 20000) return { error: "Keep replies under 20,000 characters." };
  if (!staff) {
    const limit = await hit(`reply:user:${user.id}`, LIMITS.replyUser);
    if (!limit.ok) return { error: waitMessage(limit) };
  }
  if (scanPHI(body).length) return { error: "Remove the possible patient identifiers before posting. BillerBench never stores patient information." };

  await db.transaction(async (tx) => {
    await tx.insert(A).values({ questionId: q.id, authorId: user.id, type, body });
    if (type === "EXPERT") {
      await tx.update(Q).set({ firstAnsweredAt: new Date() }).where(and(eq(Q.id, q.id), isNull(Q.firstAnsweredAt)));
      await tx.update(Q).set({ status: "ANSWERED" }).where(and(eq(Q.id, q.id), eq(Q.status, "OPEN")));
    }
  });
  after(() => (staff ? notifyAskerOfReply(q, type) : notifyStaffOfQuestion(q, "followup")));
  revalidatePath(path);
  revalidatePath("/team");
  return { ok: true };
}
