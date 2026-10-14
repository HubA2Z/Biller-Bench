---
code: A1
group: CO
category: info
quick_answer: CO-A1 means the claim or service was denied and the payer had no more specific reason code to use. A remark code is required with it and carries the real reason, so read the remark code (or call the payer) before deciding how to fix it.
related: 16, 96, 204
---
## What it means

X12 describes code A1 as **claim/service denied**, with at least one remark code required to explain why.

## Common causes

1. **Payer-specific denial reasons** that don't map to a standard code.
2. **Policy edits** explained only in the remark code or EOB message.

## How to fix it

1. **Read every remark code** and EOB message on the claim.
2. **Call the payer or check the portal** if the reason is unclear; note the call reference number.
3. **Fix the underlying problem** (correct the claim, send records or appeal) based on the actual reason.

## Prevent it next time

- Track A1 denials by payer and remark code to spot patterns.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
- [X12 Remittance Advice Remark Codes](https://x12.org/codes/remittance-advice-remark-codes)
