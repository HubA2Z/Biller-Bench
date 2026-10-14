---
code: 7
group: CO
category: coding
quick_answer: CO-7 means the procedure doesn't match the patient's sex as recorded by the payer. It's often a registration error, but it also happens with sex-specific services for patients whose recorded sex differs from the anatomy treated. Correct the data or use the payer's process for these claims.
related: 10, 6, 16
---
## What it means

X12 describes code 7 as **the procedure or revenue code is inconsistent with the patient's gender**. Some codes are edited as applying to one sex only.

## Common causes

1. **Wrong sex** recorded in registration.
2. **The wrong patient** selected on the claim.
3. **A sex-specific service** for a patient whose recorded sex doesn't match the anatomy treated.

## How to fix it

1. **Compare registration** with the eligibility response and the visit note.
2. **Correct registration errors** and resubmit.
3. **If the data is correct and the service is appropriate,** check the payer's instructions. Medicare uses condition code 45 on institutional claims and modifier KX on professional claims to show the service is appropriate despite a sex edit; commercial payers vary.

## Prevent it next time

- Verify demographics at registration.
- Keep payer-specific instructions for sex-edit overrides.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
