---
code: 8
group: CO
category: provider
quick_answer: CO-8 means the procedure code doesn't match the provider type or specialty the payer has on file for the rendering provider. Check the rendering NPI, taxonomy and the provider's enrollment specialty, and whether the payer limits this service to certain specialties.
related: 170, 172, 12
---
## What it means

X12 describes code 8 as **the procedure code is inconsistent with the provider type/specialty (taxonomy)**.

## Common causes

1. **Wrong rendering provider** on the claim (for example, the supervising physician vs. the nurse practitioner who did the service).
2. **Taxonomy on the claim** doesn't match the provider's enrollment with the payer.
3. **The payer's enrollment record** lists a different specialty.
4. **Specialty-restricted services** under the payer's policy.

## How to fix it

1. **Confirm who rendered the service** and correct the rendering NPI.
2. **Check the taxonomy** in NPPES, payer enrollment and on the claim; make them match.
3. **Update enrollment** with the payer if the specialty is wrong, then resubmit.
4. **If the payer restricts the service** to other specialties, the denial may stand.

## Prevent it next time

- Keep a provider data sheet (NPI, taxonomy, specialty) per payer.
- Review rendering provider rules for nurse practitioners, physician assistants and therapists.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
