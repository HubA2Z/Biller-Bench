import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { QAForm } from "@/components/QAForm";
import type { AskerSource } from "@/lib/qa-labels";

export const metadata: Metadata = { title: "Edit Q&A", robots: { index: false } };

export default async function EditQA({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const Q = schema.questions, A = schema.answers;
  const [q] = await db.select().from(Q).where(eq(Q.id, id));
  if (!q || q.source === "member") notFound();
  const [a] = await db.select().from(A).where(and(eq(A.questionId, id), eq(A.type, "EXPERT"), eq(A.removed, false))).orderBy(asc(A.createdAt)).limit(1);
  return (
    <>
      <div className="pagehead"><Link className="back" href="/team#qa-drafts">← Team queue</Link>
        <h1>{q.draft ? "Review Q&A draft" : "Edit Q&A"}</h1></div>
      <div style={{ maxWidth: 900 }}>
        <QAForm initial={{
          id: q.id, source: q.source as AskerSource, title: q.title, body: q.body, answer: a?.body ?? "",
          codes: q.codes.join(", "), payerGroup: q.payerGroup, payerName: q.payerName, state: q.state, specialty: q.specialty, draft: q.draft,
        }} />
      </div>
    </>
  );
}
