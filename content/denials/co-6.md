---
code: 6
group: CO
category: coding
quick_answer: CO-6 means the procedure doesn't fit the patient's age as the payer has it. It's usually a wrong birth date in registration, the wrong patient, or an age-specific code (such as a pediatric or preventive visit code) that doesn't match the patient's age.
related: 9, 7, 16
---
## What it means

X12 describes code 6 as **the procedure or revenue code is inconsistent with the patient's age**. Many codes are defined for an age range, such as preventive visits and some vaccines.

## Common causes

1. **Wrong birth date** in your registration or at the payer.
2. **Wrong age-band code,** such as a preventive visit code for the wrong age group.
3. **The wrong patient** selected for the claim (for example, a parent instead of a child).

## How to fix it

1. **Compare the birth date** in your system with the eligibility response.
2. **Check the code's age range** in the code book and pick the code that matches the patient's age on the date of service.
3. **Correct the claim and resubmit.** If the payer's birth date is wrong, the patient must fix it with the plan.

## Prevent it next time

- Copy demographics from the eligibility response.
- Add age edits for preventive and vaccine codes in your claim scrubber.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
