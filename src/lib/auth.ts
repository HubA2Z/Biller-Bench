import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { readSession } from "./session";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const s = await readSession();
  if (!s) return null;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, s.userId)).limit(1);
  // A password reset bumps sessionVersion, which signs out every older session.
  if (!u || u.sessionVersion !== s.version || u.disabledAt) return null;
  return u;
});

export const isStaff = (u: Pick<User, "role"> | null | undefined) => u?.role === "STAFF" || u?.role === "ADMIN";

export async function requireUser(next = "/") {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export const isAdmin = (u: Pick<User, "role"> | null | undefined) => u?.role === "ADMIN";

export async function requireAdmin() {
  const u = await requireUser("/team/members");
  if (!isAdmin(u)) redirect("/team");
  return u;
}

export async function requireStaff() {
  const u = await requireUser("/team");
  if (!isStaff(u)) redirect("/");
  return u;
}
