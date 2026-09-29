"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/app/actions/auth";
import { SPECIALTIES, STATES } from "@/lib/taxonomy";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div className="field"><label htmlFor="email">Email</label><input type="email" id="email" name="email" autoComplete="email" defaultValue={state?.fields?.email} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input type="password" id="password" name="password" autoComplete="current-password" required /></div>
      {state?.error && <ul className="errors" role="alert"><li>{state.error}</li></ul>}
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <p className="small muted" style={{ margin: 0 }}>New here? <Link href="/signup">Create a free account</Link></p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(signup, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="form">
      <div className="field"><label htmlFor="name">Full name</label><input type="text" id="name" name="name" autoComplete="name" defaultValue={f.name} required /></div>
      <div className="field"><label htmlFor="email">Work email</label><input type="email" id="email" name="email" autoComplete="email" defaultValue={f.email} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input type="password" id="password" name="password" autoComplete="new-password" minLength={10} required /><span className="hint">At least 10 characters.</span></div>
      <div className="field"><label htmlFor="practiceName">Practice name</label><input type="text" id="practiceName" name="practiceName" defaultValue={f.practiceName} required /></div>
      <div className="row2">
        <div className="field"><label htmlFor="specialty">Specialty</label><select id="specialty" name="specialty" defaultValue={f.specialty ?? ""} required><option value="">Choose…</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label htmlFor="state">Practice state</label><select id="state" name="state" defaultValue={f.state ?? ""} required><option value="">Choose…</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      {state?.error && <ul className="errors" role="alert"><li>{state.error}</li></ul>}
      <SubmitButton pendingText="Creating account…">Create free account</SubmitButton>
      <p className="small muted" style={{ margin: 0 }}>Already have an account? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
