"use client";
import { useActionState } from "react";
import { verifyNpi, type NpiState } from "@/app/actions/account";
import { SubmitButton } from "./SubmitButton";

export function NpiForm({ npi }: { npi?: string | null }) {
  const [state, action] = useActionState<NpiState, FormData>(verifyNpi, undefined);
  return (
    <form action={action} className="field">
      <label htmlFor="npi">Practice or provider NPI</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="text" id="npi" name="npi" inputMode="numeric" maxLength={10} defaultValue={npi ?? ""} placeholder="10 digits" style={{ flex: "1 1 160px", fontFamily: "var(--f-mono)" }} />
        <SubmitButton className="btn ghost" pendingText="Checking registry…">Verify with NPI Registry</SubmitButton>
      </div>
      <span className="hint">We match the registry name against your account. If it doesn’t match, our team reviews it.</span>
      {state?.error && <div className="npires bad">{state.error}</div>}
      {state?.message && <div className={`npires ${state.verified ? "" : "bad"}`} style={state.verified ? undefined : { borderColor: "var(--warn)", background: "var(--warn-soft)" }}>{state.message}</div>}
    </form>
  );
}
