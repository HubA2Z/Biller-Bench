import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { readSession } from "./session";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const id = await readSession();
  if (!id) return null;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return u ?? null;
});

export const isStaff = (u: Pick<User, "role"> | null | undefined) => u?.role === "STAFF" || u?.role === "ADMIN";

export async function requireUser(next = "/") {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireStaff() {
  const u = await requireUser("/team");
  if (!isStaff(u)) redirect("/");
  return u;
}
