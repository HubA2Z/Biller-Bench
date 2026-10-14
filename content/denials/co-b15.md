---
code: B15
group: CO
category: coding
quick_answer: CO-B15 means this service or procedure needs a qualifying service that wasn't received or processed, most often an add-on code billed without its primary code. Bill the primary procedure (or fix its denial) and keep both on the same claim.
related: 107, 97, 236
---
## What it means

X12 describes code B15 as **this service/procedure requires that a qualifying service/procedure be received and covered; the qualifying other service/procedure has not been received/adjudicated**.

## Common causes

1. **An add-on code** billed without its primary procedure.
2. **The primary procedure was denied,** so the add-on can't be paid.
3. **The primary was billed by another provider** or on a different claim that hasn't processed.

## How to fix it

1. **Find the primary code** the add-on requires (the code book lists the allowed primary codes).
2. **Fix the primary's denial,** if any, first.
3. **Resubmit the add-on** together with the primary on the same claim.

## Prevent it next time

- Add claim-scrubber edits for add-on codes without a primary.
- Keep add-ons and primaries on the same claim.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
