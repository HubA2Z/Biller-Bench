"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { EHR_SYSTEMS, SPECIALTIES } from "@/lib/taxonomy";
import { EXPERT_PAYERS } from "@/lib/team";
import { createLinkToken } from "@/lib/tokens";
import { sendTeamInvite } from "@/lib/notify";

const { users: U, passwordResetTokens: T } = schema;

export type MemberState = { error?: string; ok?: string } | undefined;

const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter the biller's full name."),
  role: z.enum(["STAFF", "ADMIN"]),
  credentials: z.string().trim().max(60).optional(),
  expertSpecialties: z.array(z.enum(SPECIALTIES)),
  expertPayers: z.array(z.enum(EXPERT_PAYERS)),
  expertEhr: z.array(z.enum(EHR_SYSTEMS)),
});

function readMember(form: FormData) {
  return memberSchema.safeParse({
    name: form.get("name") ?? "",
    role: form.get("role") === "ADMIN" ? "ADMIN" : "STAFF",
    credentials: String(form.get("credentials") ?? "") || undefined,
    expertSpecialties: form.getAll("expertSpecialties"),
    expertPayers: form.getAll("expertPayers"),
    expertEhr: form.getAll("expertEhr"),
  });
}

async function activeAdmins(excludeId?: string) {
  const [{ n }] = await db.select({ n: count() }).from(U)
    .where(and(eq(U.role, "ADMIN"), isNull(U.disabledAt), excludeId ? ne(U.id, excludeId) : undefined));
  return n;
}

async function invite(userId: string, email: string, name: string, invitedBy: string) {
  // Old invite links stop working when a new one is sent.
  await db.update(T).set({ usedAt: new Date() }).where(and(eq(T.userId, userId), eq(T.purpose, "invite"), isNull(T.usedAt)));
  const token = await createLinkToken(userId, "invite", 24 * 7);
  after(() => sendTeamInvite(email, name, invitedBy, token));
}

/** Adds a biller to the team and emails them a link to set their password. */
export async function addMember(_: MemberState, form: FormData): Promise<MemberState> {
  const admin = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address." };
  const parsed = readMember(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [existing] = await db.select().from(U).where(eq(U.email, email));
  if (existing && existing.role === "PROVIDER") return { error: "That email belongs to a provider account. Use a different email for team work." };
  if (existing) return { error: `${existing.name} is already on the team.` };

  const [u] = await db.insert(U).values({
    email, name: d.name, role: d.role, credentials: d.credentials ?? null,
    expertSpecialties: d.expertSpecialties, expertPayers: d.expertPayers, expertEhr: d.expertEhr,
    // Unusable until they set their own password from the invite link.
    passwordHash: await bcrypt.hash(randomBytes(24).toString("base64url"), 12),
  }).returning();
  await invite(u.id, u.email, u.name, admin.name);
  revalidatePath("/team/members");
  return { ok: `Invite sent to ${u.email}. The link expires in 7 days.` };
}

export async function updateMember(_: MemberState, form: FormData): Promise<MemberState> {
  const admin = await requireAdmin();
  const id = String(form.get("userId"));
  const parsed = readMember(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const [m] = await db.select().from(U).where(eq(U.id, id));
  if (!m || m.role === "PROVIDER") return { error: "That team member doesn't exist." };
  if (m.role === "ADMIN" && d.role !== "ADMIN" && (await activeAdmins(m.id)) === 0) {
    return { error: "Keep at least one admin. Make someone else an admin first." };
  }
  await db.update(U).set({
    name: d.name, role: d.role, credentials: d.credentials ?? null,
    expertSpecialties: d.expertSpecialties, expertPayers: d.expertPayers, expertEhr: d.expertEhr,
  }).where(eq(U.id, id));
  revalidatePath("/team/members");
  revalidatePath("/experts");
  return { ok: id === admin.id && d.role !== "ADMIN" ? "Saved. You're no longer an admin." : "Saved." };
}

/** Turning a member off signs them out everywhere and stops their alerts; their answers stay. */
export async function setMemberActive(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("userId"));
  const active = form.get("active") === "true";
  if (id === admin.id) return;
  const [m] = await db.select().from(U).where(eq(U.id, id));
  if (!m || m.role === "PROVIDER") return;
  if (!active && m.role === "ADMIN" && (await activeAdmins(m.id)) === 0) return;
  await db.update(U).set(active
    ? { disabledAt: null }
    : { disabledAt: new Date(), sessionVersion: sql`${U.sessionVersion} + 1` }).where(eq(U.id, id));
  revalidatePath("/team/members");
  revalidatePath("/experts");
}

export async function resendInvite(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("userId"));
  const [m] = await db.select().from(U).where(eq(U.id, id));
  if (!m || m.role === "PROVIDER" || m.lastLoginAt || m.disabledAt) return;
  await invite(m.id, m.email, m.name, admin.name);
  revalidatePath("/team/members");
}
