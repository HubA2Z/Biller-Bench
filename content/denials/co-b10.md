---
code: B10
group: CO
category: coding
quick_answer: CO-B10 means the allowed amount was reduced because part of this procedure was already paid, for example the professional or technical component billed separately. Make sure you're billing the correct global, professional (26) or technical (TC) version.
related: 97, 4, 59
---
## What it means

X12 describes code B10 as **allowed amount has been reduced because a component of the basic procedure/test was paid; the beneficiary is not liable for more than the charge limit for the basic procedure/test**.

## Common causes

1. **Global billing** when another provider already billed the professional (26) or technical (TC) component.
2. **A component billed twice** by different providers or on different claims.
3. **Facility vs. professional overlap** for diagnostic tests.

## How to fix it

1. **Check who billed which component** and on which claim.
2. **If you only performed one component,** rebill with modifier 26 or TC.
3. **If the other provider billed in error,** coordinate with them; the payer pays each component once.

## Prevent it next time

- Agree in writing with hospitals and imaging centers who bills which component.
- Set modifier 26 or TC defaults by location.

## Sources

- [X12 Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
