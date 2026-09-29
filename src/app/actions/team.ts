"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";

const { questions: Q, answers: A, flags: F, serviceRequests: S, users: U } = schema;

/** Restore a reported post, or remove it for good. */
export async function resolveFlag(form: FormData) {
  const staff = await requireStaff();
  const id = String(form.get("flagId"));
  const decision = form.get("decision") === "remove" ? "REMOVED" : "RESTORED";
  const [f] = await db.select().from(F).where(eq(F.id, id));
  if (!f || f.status !== "OPEN") return;
  await db.transaction(async (tx) => {
    // Resolve every open report on the same post together.
    const same = f.questionId ? eq(F.questionId, f.questionId) : eq(F.answerId, f.answerId!);
    const open = await tx.select({ id: F.id, status: F.status }).from(F).where(same);
    for (const o of open) if (o.status === "OPEN") await tx.update(F).set({ status: decision, resolvedById: staff.id, resolvedAt: new Date() }).where(eq(F.id, o.id));
    const patch = decision === "REMOVED" ? { hidden: true, removed: true } : { hidden: false };
    if (f.questionId) await tx.update(Q).set(patch).where(eq(Q.id, f.questionId));
    else await tx.update(A).set(patch).where(eq(A.id, f.answerId!));
  });
  revalidatePath("/team");
  revalidatePath("/");
}

export async function setLeadStatus(form: FormData) {
  await requireStaff();
  const id = String(form.get("leadId"));
  const status = String(form.get("status"));
  if (!["NEW", "CONTACTED", "WON", "LOST"].includes(status)) return;
  await db.update(S).set({ status: status as "NEW" }).where(eq(S.id, id));
  revalidatePath("/team");
}

/** Confirm a provider's NPI by hand when the registry name didn't match automatically. */
export async function approveNpi(form: FormData) {
  const staff = await requireStaff();
  const id = String(form.get("userId"));
  await db.update(U).set({ npiVerifiedAt: new Date(), npiNote: `Approved by ${staff.name}` }).where(eq(U.id, id));
  revalidatePath("/team");
}
