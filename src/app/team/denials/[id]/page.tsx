import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { denialPath } from "@/lib/denials";
import { DenialForm } from "@/components/DenialForm";

export const metadata: Metadata = { title: "Edit denial code page", robots: { index: false } };

export default async function EditDenial({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [d] = await db.select().from(schema.denialCodes).where(eq(schema.denialCodes.id, id));
  if (!d) notFound();
  return (
    <>
      <div className="pagehead"><Link className="back" href="/team/denials">← Denial code pages</Link>
        <h1>{d.groupCode}-{d.code}</h1><p className="small muted" style={{ margin: 0 }}><Link href={denialPath(d)}>View the page</Link></p></div>
      <div style={{ maxWidth: 900 }}><DenialForm initial={d} /></div>
    </>
  );
}
