import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { QAForm } from "@/components/QAForm";

export const metadata: Metadata = { title: "Publish as Q&A", robots: { index: false } };

export default async function NewQA({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireStaff();
  const { from } = await searchParams;
  const [inq] = from ? await db.select().from(schema.inquiries).where(eq(schema.inquiries.id, from)) : [];
  const code = inq?.topic?.match(/Denial help: (\S+)/)?.[1];
  const codes = inq?.message.match(/^Codes: (.+)$/m)?.[1] ?? "";
  return (
    <>
      <div className="pagehead"><Link className="back" href="/team#messages">← Team queue</Link>
        <h1>{inq ? "Publish a message as a Q&A" : "Write a common question"}</h1>
        {inq && <p className="small" style={{ margin: 0 }}>{inq.shareOk
          ? <span className="status-pill PUBLISHED">Sender agreed to anonymous publishing</span>
          : <span className="status-pill">No permission given: publish only a rewritten, general version of the question</span>}</p>}
      </div>
      <div style={{ maxWidth: 900 }}>
        <QAForm original={inq ? `${inq.topic ?? ""}\n\n${inq.message}` : undefined} initial={{
          inquiryId: inq?.id, source: inq ? "reader" : "team",
          title: code ? `${code} denial: ` : "", body: "", answer: "", codes,
          payerGroup: "General", payerName: "All payers", state: "US", specialty: "Primary Care",
        }} />
      </div>
    </>
  );
}
