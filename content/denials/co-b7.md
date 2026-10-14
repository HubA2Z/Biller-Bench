---
code: B7
group: CO
category: provider
quick_answer: CO-B7 means the provider wasn't certified or eligible to be paid for this procedure on this date of service. Usually the enrollment or certification (such as CLIA for lab tests) wasn't active on the date of service.
related: 185, 299, 16
---
## What it means

X12 describes code B7 as **this provider was not certified/eligible to be paid for this procedure/service on this date of service**.

## Common causes

1. **Enrollment not effective** on the date of service.
2. **Lab tests** outside the lab's CLIA certificate level, or a missing or expired CLIA certificate.
3. **Lapsed enrollment or revalidation.**

## How to fix it

1. **Check enrollment and certification dates** with the payer.
2. **For lab claims,** confirm the CLIA number on the claim and that the test is allowed under the certificate type.
3. **If enrollment was approved retroactively,** resubmit; otherwise the denial stands.

## Prevent it next time

- Track enrollment, revalidation and CLIA renewal dates.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
