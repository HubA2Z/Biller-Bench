"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { recordAudience, recordHelpAnswer } from "@/app/actions/audience";
import { AUDIENCE_ROLES, type AudienceRole } from "@/lib/audience";

const KEY = "bb-audience";
const read = () => { try { return localStorage.getItem(KEY); } catch { return "unavailable"; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* private mode: just don't remember */ } };

type Step = "role" | "help" | "thanks";

/**
 * A small corner card for first-time visitors: "Who's reading?", then for
 * physicians, practices and billers "Need billing help?" (Yes opens the
 * Contact form with the right topic). Shown once, never blocks the page.
 */
export function AudiencePrompt() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<AudienceRole | null>(null);
  const responseId = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    if (read() !== null) return; // answered, dismissed, or storage unavailable
    if (/^\/(team|login|signup|forgot-password|reset-password|account|contact)/.test(path)) return;
    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, [path]);

  useEffect(() => {
    if (step !== "thanks") return;
    const t = setTimeout(() => setOpen(false), 10000);
    return () => clearTimeout(t);
  }, [step]);

  if (!open) return null;
  const close = () => { if (step === "role") write("dismissed"); setOpen(false); };
  const choose = (r: AudienceRole) => {
    write(r); setRole(r);
    responseId.current = recordAudience(r, path).catch(() => null);
    setStep(AUDIENCE_ROLES[r].followUp ? "help" : "thanks");
  };
  const answerHelp = async (yes: boolean) => {
    const id = await responseId.current;
    if (id) recordHelpAnswer(id, yes).catch(() => {});
    if (yes && role) { setOpen(false); router.push(AUDIENCE_ROLES[role].followUp!.yes); }
    else setStep("thanks");
  };

  return (
    <div className="aud" role="dialog" aria-labelledby="aud-title" aria-live="polite">
      <button className="aud-x" type="button" aria-label="Close" onClick={close}>×</button>
      {step === "role" && (
        <>
          <p id="aud-title" className="aud-h">Quick question: who’s reading?</p>
          <p className="aud-sub">One click helps us write for you. We don’t collect your name or email.</p>
          <div className="aud-opts">
            {(Object.keys(AUDIENCE_ROLES) as AudienceRole[]).map((r) => (
              <button key={r} type="button" onClick={() => choose(r)}>{AUDIENCE_ROLES[r].label}</button>
            ))}
          </div>
        </>
      )}
      {step === "help" && role && (
        <>
          <p id="aud-title" className="aud-h">{AUDIENCE_ROLES[role].followUp!.question}</p>
          <p className="aud-sub">Our certified billers handle claims, denials, appeals, eligibility, prior authorizations and AR.</p>
          <div className="aud-yn">
            <button type="button" className="btn sm" onClick={() => answerHelp(true)}>Yes, contact us</button>
            <button type="button" className="btn sm ghost" onClick={() => answerHelp(false)}>Not right now</button>
          </div>
        </>
      )}
      {step === "thanks" && role && (
        <>
          <p id="aud-title" className="aud-h">Thanks, that helps.</p>
          <Link className="btn sm" href={AUDIENCE_ROLES[role].browse.href} onClick={() => setOpen(false)}>{AUDIENCE_ROLES[role].browse.text}</Link>
        </>
      )}
    </div>
  );
}
