import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { DenialForm } from "@/components/DenialForm";

export const metadata: Metadata = { title: "Add a denial code", robots: { index: false } };

export default async function NewDenial() {
  await requireStaff();
  return (
    <>
      <div className="pagehead"><Link className="back" href="/team/denials">← Denial code pages</Link><h1>Add a denial code page</h1></div>
      <div style={{ maxWidth: 900 }}><DenialForm /></div>
    </>
  );
}
