import type { Metadata } from "next";
import Link from "next/link";
import { isStaff, requireUser } from "@/lib/auth";
import { AskForm } from "@/components/AskForm";

export const metadata: Metadata = { title: "Ask our billers", robots: { index: false } };

export default async function AskPage() {
  const user = await requireUser("/ask");
  if (isStaff(user)) {
    return <div className="card"><h1>Ask our billers</h1><p>Team accounts answer questions. Open the team queue to pick one up.</p><Link className="btn" href="/team">Open team queue</Link></div>;
  }
  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">New question</span>
        <h1>Ask our certified billers</h1>
        <p className="muted" style={{ maxWidth: "62ch", margin: 0 }}>Tag the code, payer and specialty so the right biller on our team picks it up.</p>
      </div>
      <AskForm defaults={{ state: user.state ?? "", specialty: user.specialty ?? "" }} />
    </>
  );
}
