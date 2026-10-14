---
code: 5
group: CO
category: coding
quick_answer: CO-5 means the procedure code (or type of bill) doesn't match the place of service on the claim. Either the place of service code is wrong, or the service isn't payable in that setting. Check where the service actually happened and correct the place of service.
related: 58, 4, 16
---
## What it means

X12 describes code 5 as **the procedure code or type of bill is inconsistent with the place of service**. The payer's edits say this code can't be billed with the place of service (POS) on the claim.

## Common causes

1. **Wrong POS code,** such as office (11) billed for a service done in the hospital outpatient department (22) or inpatient (21).
2. **Facility-only codes** billed with an office POS, or office-only codes with a facility POS.
3. **Telehealth POS** (02 or 10) used for a code the payer doesn't allow by telehealth.
4. **Default POS** in the practice management system that wasn't changed.

## How to fix it

1. **Check the documentation** for where the patient physically was and where the provider was.
2. **Correct the POS** and send a corrected claim (or a Medicare reopening).
3. **If the POS was right,** check the payer's policy: the service may not be covered in that setting.

## Prevent it next time

- Set POS by location in your scheduling system instead of a single default.
- Add claim-scrubber edits for facility-only and office-only codes.
- Keep a list of each payer's telehealth POS and modifier rules.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
