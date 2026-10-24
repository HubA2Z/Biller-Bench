import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { ANSWER_TIME } from "@/lib/plans";
import { AskForm } from "@/components/AskForm";
import { DenialHelpForm } from "@/components/InquiryForms";

export const metadata: Metadata = { title: "Ask our billers", robots: { index: false } };

export default async function AskPage() {
  const user = await getCurrentUser();
  if (user && isStaff(user)) {
    return <div className="card"><h1>Ask our billers</h1><p>Team accounts answer questions. Open the team queue to pick one up.</p><Link className="btn" href="/team">Open team queue</Link></div>;
  }
  if (!user) {
    return (
      <>
        <div className="pagehead">
          <span className="eyebrow">Free, no account needed</span>
          <h1>Ask our certified billers</h1>
          <p className="muted" style={{ maxWidth: "62ch", margin: 0 }}>Describe the claim or coding question. A certified biller on our team replies by email within {ANSWER_TIME.label}. Please don’t include patient names, dates of birth or member IDs.</p>
        </div>
        <div className="card" style={{ maxWidth: 760 }}><DenialHelpForm /></div>
        <p className="small muted" style={{ marginTop: 14 }}>Prefer to post publicly and track answers? <Link className="clear" href="/signup">Create a free provider account</Link> or <Link className="clear" href="/login?next=/ask">sign in</Link>.</p>
      </>
    );
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
