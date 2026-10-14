---
code: 3
group: PR
category: patient
quick_answer: PR-3 means the amount is the patient's copay, the fixed fee their plan charges for this type of visit. The claim was processed correctly. Collect it from the patient, ideally at check-in.
related: 1, 2, 45
---
## What it means

The plan charges the patient a **fixed copayment** for this service, such as $30 for an office visit, and reduced its payment by that amount. Group code **PR** means the patient owes it.

## Common causes

1. **Office visits, specialist visits and urgent care** under plans with copays.
2. **More than one copay** on the same day when the plan counts services separately.
3. **A specialist copay** applied when the practice expected the primary care copay.

## How to fix it

1. **Check whether the copay was already collected** at check-in, and post it against this claim.
2. **If a copay was collected but the payer applied a different amount,** refund or bill the difference.
3. **If the wrong copay tier was used** (specialist instead of primary care, for example), check that the provider's specialty and taxonomy on file with the payer are correct, then ask for reprocessing.
4. **Bill the secondary payer** if the patient has one.

## Prevent it next time

- Read the copay from the eligibility response, not only the insurance card.
- Collect copays at check-in.
- Keep provider specialty and taxonomy current with each payer.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
