import type { Metadata } from "next";
import { ForgotForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Forgot() {
  return (
    <div className="auth card">
      <h1 style={{ margin: "0 0 6px" }}>Reset your password</h1>
      <p className="muted small" style={{ marginTop: 0 }}>Enter your account email and we’ll send you a link to choose a new password.</p>
      <ForgotForm />
    </div>
  );
}
