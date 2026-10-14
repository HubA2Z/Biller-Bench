---
code: 4
group: CO
category: coding
quick_answer: CO-4 means the procedure code doesn't match the modifier on the claim. Either a modifier was used that doesn't apply to that code, or a modifier the payer requires is missing. Fix the modifier based on the documentation and send a corrected claim. With group code CO, you can't bill the patient.
related: 97, 16, 11
---
## What it means

The payer's edits found that the **modifier and the procedure code don't fit together**. X12 describes code 4 as "the procedure code is inconsistent with the modifier used." Some payers also use it when a **required modifier is missing**.

## Common causes

1. **Professional/technical modifiers on the wrong code.** Modifier 26 or TC on a code that has no separate professional and technical parts.
2. **Bilateral or side modifiers that don't apply.** Modifier 50, RT or LT on a code that isn't paired or bilateral, or 50 on a code the payer wants billed with RT and LT instead.
3. **Assistant-at-surgery modifiers** (80, 81, 82, AS) on a procedure the payer doesn't pay assistants for.
4. **Missing required modifiers**, such as telehealth, therapy or anatomic modifiers the payer's policy requires.
5. **Modifier in the wrong position**, where the payer reads only the first modifier for pricing.

## How to fix it

1. **Identify the line and modifier.** Check the remittance and any remark codes for the line.
2. **Check the code's indicators.** For Medicare, the Physician Fee Schedule shows whether a code allows professional/technical split, bilateral payment and assistants at surgery. For commercial payers, check the payer's modifier and reimbursement policies.
3. **Compare with the documentation.** Use the modifier that matches what was actually done and documented.
4. **Correct the claim.** Commercial payers: corrected claim with the original claim number. Medicare: reopening through your MAC for a processed claim.
5. **If the payer's policy doesn't allow the modifier at all,** the service may not be separately payable. Adjust it off.

## Medicare vs. commercial payers

| | Medicare | Most commercial payers |
|---|---|---|
| Where the rules live | Physician Fee Schedule indicators, NCCI | Payer reimbursement and modifier policies |
| Bilateral billing | Depends on the code's bilateral indicator | Some want 50, others want RT and LT on two lines |
| Correction | Reopening | Corrected claim |

## Prevent it next time

- Build a modifier cheat sheet for your top 25 codes, by payer.
- Add claim-scrubber rules for 26/TC, 50 and RT/LT combinations.
- Put payment-affecting modifiers in the first position.
- Review CO-4 denials monthly to spot a template or charge-master error.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
- [CMS NCCI Policy Manual for Medicare, Chapter I (2026)](https://www.cms.gov/files/document/01-chapter1-ncci-medicare-policy-manual-2026-final.pdf)
