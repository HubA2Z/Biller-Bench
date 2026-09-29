import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { MemberForm } from "@/components/MemberForm";

export const metadata: Metadata = { title: "Edit team member", robots: { index: false } };

export default async function EditMember({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u || u.role === "PROVIDER") notFound();
  return (
    <>
      <Link className="back" href="/team/members">← Team members</Link>
      <div className="pagehead"><span className="eyebrow">Admin</span><h1>{u.name}</h1></div>
      <div className="card" style={{ maxWidth: 760 }}>
        <MemberForm member={{ id: u.id, name: u.name, email: u.email, role: u.role === "ADMIN" ? "ADMIN" : "STAFF", credentials: u.credentials,
          expertSpecialties: u.expertSpecialties, expertPayers: u.expertPayers, expertEhr: u.expertEhr }} />
      </div>
    </>
  );
}
