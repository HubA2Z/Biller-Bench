// Loads sample team members, practices and questions for local development.
import "./load-env";
import bcrypt from "bcryptjs";
import { db, schema } from "../src/db";
import { addBusinessHours } from "../src/lib/sla";
import { slugify } from "../src/lib/slug";

const H = 3600_000, D = 24 * H;
const ago = (ms: number) => new Date(Date.now() - ms);

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a production database.");
  const staffPw = await bcrypt.hash(process.env.SEED_STAFF_PASSWORD || "change-me-now", 12);
  const provPw = await bcrypt.hash("provider-demo-1", 12);
  const U = schema.users;

  const ins = (v: typeof U.$inferInsert) => db.insert(U).values(v).onConflictDoNothing({ target: U.email }).returning();
  const [marcus] = await ins({ email: "marcus@billerbench.test", name: "Marcus Webb", credentials: "CPC", role: "STAFF", passwordHash: staffPw, expertSpecialties: ["Orthopedics", "Pain Management"], expertPayers: ["Medicare", "UHC", "BCBS"], expertEhr: ["Epic", "athenahealth"] });
  const [denise] = await ins({ email: "denise@billerbench.test", name: "Denise Alvarez", credentials: "CPB, CPC", role: "ADMIN", passwordHash: staffPw, expertSpecialties: ["Mental Health", "Telehealth"], expertPayers: ["UHC", "UMR", "Optum"], expertEhr: ["Tebra (Kareo)"] });
  const [tom] = await ins({ email: "tom@billerbench.test", name: "Tom Nguyen", credentials: "RHIT", role: "STAFF", passwordHash: staffPw, expertSpecialties: ["Primary Care", "Cardiology", "Physical Therapy"], expertPayers: ["Medicare", "Cigna", "Meritain Health"], expertEhr: ["eClinicalWorks", "CMD"] });
  const [priya] = await ins({ email: "priya@example.test", name: "Priya Raman", practiceName: "Raman Family Practice", specialty: "Primary Care", state: "OH", passwordHash: provPw, plan: "BASIC", npi: "1234567893", npiVerifiedAt: new Date() });
  const [linda] = await ins({ email: "linda@example.test", name: "Linda Okafor", practiceName: "Lakeside Orthopedics", specialty: "Orthopedics", state: "PA", passwordHash: provPw, plan: "PRO", npiVerifiedAt: new Date() });
  const [ray] = await ins({ email: "ray@example.test", name: "Ray Castillo", practiceName: "Castillo Clinic", specialty: "Primary Care", state: "TX", passwordHash: provPw });
  if (!marcus || !denise || !tom || !priya || !linda || !ray) { console.log("Sample data already loaded."); process.exit(0); }

  const q = async (v: Omit<typeof schema.questions.$inferInsert, "slug" | "dueAt"> & { hours: number }, answers: { by: string; type: "EXPERT" | "FOLLOWUP"; after: number; body: string; votes?: number }[] = [], accept?: number) => {
    const createdAt = v.createdAt as Date;
    const [row] = await db.insert(schema.questions).values({ ...v, slug: `${slugify(v.title)}-${Math.random().toString(16).slice(2, 8)}`, dueAt: addBusinessHours(createdAt, v.hours) }).returning();
    let first: Date | null = null; const ids: string[] = [];
    for (const a of answers) {
      const at = new Date(createdAt.getTime() + a.after);
      const [ar] = await db.insert(schema.answers).values({ questionId: row.id, authorId: a.by, type: a.type, body: a.body, voteCount: a.votes ?? 0, createdAt: at }).returning();
      ids.push(ar.id);
      if (a.type === "EXPERT" && !first) first = at;
    }
    const { eq } = await import("drizzle-orm");
    await db.update(schema.questions).set({
      firstAnsweredAt: first, status: accept !== undefined ? "SOLVED" : first ? "ANSWERED" : "OPEN", acceptedAnswerId: accept !== undefined ? ids[accept] : null,
    }).where(eq(schema.questions.id, row.id));
  };

  await q({ authorId: linda.id, createdAt: ago(2 * D), tier: "FREE", hours: 24, title: "99214-25 with 20610 on the same day denied CO-97 by Novitas Medicare", codes: ["99214", "20610", "M17.11"], modifiers: ["25"], payerGroup: "Medicare", payerName: "Novitas JL", state: "PA", specialty: "Orthopedics", ehr: "athenahealth", voteCount: 18,
    body: "Established patient, follow-up for knee OA. Provider also managed a new problem at the same visit and documented it separately. A large-joint injection (20610) was done.\n\nNovitas paid the injection and denied the E/M with **CO-97**. Modifier 25 was on the claim. Is this a documentation problem, or is something off in how the lines were built?" },
    [{ by: marcus.id, type: "EXPERT", after: 6 * H, votes: 14, body: "20610 has a **0-day global**, so the decision to inject and the usual pre-procedure evaluation are already paid in the injection. Modifier 25 only holds up when the note shows work *beyond* that.\n\n- Modifier 25 is on the **E/M line**, not on 20610.\n- The E/M line points to the new problem's diagnosis, not only `M17.11`.\n- The note separates the new problem's history, exam and plan from the injection decision.\n\nIf all three are right, send a redetermination with the note. See the [NCCI Policy Manual](https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-policy-manual), chapter 1." },
     { by: tom.id, type: "FOLLOWUP", after: 20 * H, votes: 3, body: "Also confirm the modifier reached the payer. Open the 837 or the clearinghouse claim view; some PM systems drop modifiers when the E/M charge is keyed after the procedure." }], 0);

  await q({ authorId: priya.id, createdAt: ago(1 * D), tier: "FREE", hours: 24, title: "G2211 denied when billed with 99214-25 and a flu shot on Medicare (CGS)", codes: ["G2211", "99214", "90686", "G0008"], modifiers: ["25"], payerGroup: "Medicare", payerName: "CGS J15", state: "OH", specialty: "Primary Care", ehr: "eClinicalWorks", voteCount: 14,
    body: "Longitudinal-care patient, E/M with modifier 25 because we also gave the flu vaccine (G0008 admin). CGS denied G2211 only. Is G2211 ever payable with a modifier 25 E/M?" },
    [{ by: tom.id, type: "EXPERT", after: 4 * H, votes: 11, body: "It depends on the date of service.\n\n- **2024 dates:** G2211 was not payable when the E/M had modifier 25.\n- **2025 and later:** CMS allows G2211 with a modifier 25 E/M when the other same-day service is an annual wellness visit, a **vaccine administration**, or a Medicare Part B preventive service.\n\nG0008 is vaccine administration, so a 2025+ claim like this should pay. Source: the [CY 2025 Physician Fee Schedule final rule](https://www.cms.gov/medicare/payment/fee-schedules/physician)." }], 0);

  await q({ authorId: priya.id, createdAt: ago(5 * H), tier: "PLAN", hours: 8, isPrivate: false, title: "90837 telehealth to patient home for UHC commercial: POS 10 or 02, and is modifier 95 still needed?", codes: ["90837", "F41.1"], modifiers: ["95"], payerGroup: "Commercial", payerName: "UHC", state: "OH", specialty: "Telehealth", voteCount: 9,
    body: "We added a part-time therapist. Sessions are 53+ minutes, audio-video, patient at home. UHC rejected two claims billed with POS 11 + modifier 95. Which POS and modifier combination does UHC commercial want now?" },
    [{ by: denise.id, type: "EXPERT", after: 2 * H + 10 * 60_000, votes: 9, body: "POS 11 is the problem. For a patient at home, UHC commercial telehealth claims have used **POS 10** with modifier **95** for audio-video visits.\n\n- Self-funded plans that UHC administers (including UMR) can follow different rules.\n- UHC updates this policy often. Confirm against the current reimbursement policy on [UHCprovider.com](https://www.uhcprovider.com/en/policies-protocols/commercial-policies/commercial-reimbursement-policies.html) before you resubmit." }]);

  await q({ authorId: linda.id, createdAt: ago(3 * H), tier: "PLAN", hours: 4, title: "Bilateral 64483: modifier 50 or RT/LT for Palmetto GBA Medicare?", codes: ["64483", "M54.16"], modifiers: ["50", "RT", "LT"], payerGroup: "Medicare", payerName: "Palmetto GBA JM", state: "NC", specialty: "Pain Management", ehr: "Epic", voteCount: 6,
    body: "Transforaminal ESI, lumbar, single level, both sides. Our NC office billed one line with 50; a colleague says Palmetto wants two lines with RT and LT. Which is correct?" },
    [{ by: marcus.id, type: "FOLLOWUP", after: 1 * H, body: "Picked this up. While I check Palmetto's guidance: was it one level on each side, and did you bill 1 or 2 units on the modifier 50 line?" }]);

  await q({ authorId: priya.id, createdAt: ago(5 * H), tier: "PLAN", hours: 8, isPrivate: true, title: "Meritain Health claim “in process” for 45 days: when and how do we escalate?", codes: ["99214"], modifiers: [], payerGroup: "Commercial", payerName: "Meritain Health", state: "OH", specialty: "Primary Care", ehr: "CMD",
    body: "Clean claim accepted at the clearinghouse, portal still shows in process after 45 days. Two calls, no resolution. What's the next step, and is there a prompt-pay rule we can cite?" });

  await q({ authorId: ray.id, createdAt: ago(40 * 60_000), tier: "URGENT", hours: 4, isPrivate: true, paidAt: ago(39 * 60_000), title: "UMR denied 99396 + 99214-25 with CO-4 on the same day", codes: ["99396", "99214"], modifiers: ["25"], payerGroup: "Commercial", payerName: "UMR", state: "TX", specialty: "Primary Care", ehr: "CMD",
    body: "Annual preventive visit plus a problem-oriented visit. UMR paid 99396 and denied the 99214 with CO-4 (modifier inconsistent with procedure). Should the 25 be on a different line?" });

  await q({ authorId: ray.id, createdAt: ago(9 * H), tier: "FREE", hours: 24, title: "Tebra: Texas Medicaid secondary not crossing over after Medicare pays primary", codes: ["99213"], modifiers: [], payerGroup: "Medicaid", payerName: "TX", state: "TX", specialty: "Primary Care", ehr: "Tebra (Kareo)", voteCount: 3,
    body: "Dual-eligible patients. Medicare pays, but nothing ever shows up from Texas Medicaid. Do we need to send the secondary manually from Tebra, and what settings control that?" });

  await db.insert(schema.serviceRequests).values([
    { service: "audit", practiceName: "Northside Pediatrics", contactName: "Office manager", email: "office@northside.test", claimsPerMonth: "400–1,000", payers: "Aetna, BCBS", note: "Seeing a lot of CO-16 on well visits." },
    { service: "rcm", practiceName: "Coastal Pain Center", contactName: "Imani Brooks", email: "ibrooks@coastal.test", claimsPerMonth: "1,000+", payers: "Medicare, UHC", note: "Our biller is leaving next month." },
  ]);
  console.log("Sample data loaded.\n  Team: marcus@ / denise@ / tom@billerbench.test (password from SEED_STAFF_PASSWORD)\n  Providers: priya@ / linda@ / ray@example.test (password provider-demo-1)");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
