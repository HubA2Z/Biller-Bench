"use client";
import { useActionState } from "react";
import { addMember, updateMember, type MemberState } from "@/app/actions/team-members";
import { EHR_SYSTEMS, SPECIALTIES } from "@/lib/taxonomy";
import { EXPERT_PAYERS } from "@/lib/team";
import { SubmitButton } from "./SubmitButton";

type Member = {
  id: string; name: string; email: string; role: "STAFF" | "ADMIN"; credentials: string | null;
  expertSpecialties: string[]; expertPayers: string[]; expertEhr: string[];
};

function Picks({ name, options, selected, label }: { name: string; options: readonly string[]; selected: string[]; label: string }) {
  return (
    <div className="field"><span className="lbl">{label}</span>
      <div className="modpick">{options.map((o) => (
        <label key={o} style={{ fontFamily: "var(--f-body)" }}><input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} />{o}</label>
      ))}</div>
    </div>
  );
}

export function MemberForm({ member }: { member?: Member }) {
  const [state, action] = useActionState<MemberState, FormData>(member ? updateMember : addMember, undefined);
  const m = member;
  return (
    <form action={action} className="form" key={state?.ok && !m ? state.ok : "form"}>
      {m && <input type="hidden" name="userId" value={m.id} />}
      <div className="row2">
        <div className="field"><label htmlFor="name">Full name <span className="req">*</span></label><input type="text" id="name" name="name" defaultValue={m?.name} required /></div>
        <div className="field"><label htmlFor="email">Work email <span className="req">*</span></label>
          {m ? <input type="email" id="email" value={m.email} disabled /> : <input type="email" id="email" name="email" required />}
          {!m && <span className="hint">We email them a link to set their own password.</span>}</div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="credentials">Credentials</label><input type="text" id="credentials" name="credentials" defaultValue={m?.credentials ?? ""} placeholder="e.g. CPC, CPB" /></div>
        <div className="field"><label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue={m?.role ?? "STAFF"}>
            <option value="STAFF">Biller</option>
            <option value="ADMIN">Admin (also manages the team)</option>
          </select><span className="hint">Billers answer questions. Admins can also add and turn off billers.</span></div>
      </div>
      <Picks name="expertSpecialties" label="Specialties" options={SPECIALTIES} selected={m?.expertSpecialties ?? []} />
      <Picks name="expertPayers" label="Strongest payers" options={EXPERT_PAYERS} selected={m?.expertPayers ?? []} />
      <Picks name="expertEhr" label="EHR / PM software" options={EHR_SYSTEMS} selected={m?.expertEhr ?? []} />
      <p className="hint" style={{ margin: 0 }}>Specialties, payers and software show on the public “Our experts” page.</p>
      {state?.error && <ul className="errors" role="alert"><li>{state.error}</li></ul>}
      {state?.ok && <div className="phi ok">{state.ok}</div>}
      <div><SubmitButton pendingText={m ? "Saving…" : "Sending invite…"}>{m ? "Save changes" : "Add and send invite"}</SubmitButton></div>
    </form>
  );
}
