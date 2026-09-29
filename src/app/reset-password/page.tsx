import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string; invite?: string }> }) {
  const { token, invite } = await searchParams;
  return (
    <div className="auth card">
      <h1 style={{ margin: "0 0 6px" }}>{invite ? "Welcome to the BillerBench team" : "Choose a new password"}</h1>
      {invite && <p className="muted small" style={{ marginTop: 0 }}>Set a password to finish setting up your account.</p>}
      {token ? <ResetForm token={token} /> : <p>This link is incomplete. <Link href="/forgot-password">Request a new reset link</Link>.</p>}
    </div>
  );
}
