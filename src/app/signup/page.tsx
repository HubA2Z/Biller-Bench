import type { Metadata } from "next";
import { SignupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Join free", robots: { index: false } };

export default function Signup() {
  return (
    <div className="auth card">
      <span className="eyebrow">Free account</span>
      <h1 style={{ margin: "4px 0 6px" }}>Join BillerBench</h1>
      <p className="muted small" style={{ marginTop: 0 }}>For physicians, practice managers and in-house billing staff.</p>
      <SignupForm />
    </div>
  );
}
