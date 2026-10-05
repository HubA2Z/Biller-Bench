import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ArticleForm } from "@/components/ArticleForm";

export const metadata: Metadata = { title: "Write an update", robots: { index: false } };

export default async function NewUpdate() {
  await requireAdmin();
  return (
    <>
      <Link className="back" href="/team/updates">← Articles and updates</Link>
      <div className="pagehead"><span className="eyebrow">Admin</span><h1>Write an update</h1></div>
      <div style={{ maxWidth: 860 }}><ArticleForm /></div>
    </>
  );
}
