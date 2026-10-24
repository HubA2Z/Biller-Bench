---
title: How do we send a corrected claim to a commercial payer (frequency code 7 vs 8)?
codes: 99213
payer_group: Commercial
payer_name: All commercial payers
state: US
specialty: Primary Care
---
# Question
We need to fix a wrong diagnosis on a claim the payer already processed. If we send it again, it's denied as a duplicate. How should a corrected claim be sent?

# Answer
**Short answer:** send a **replacement claim**: claim frequency code **7** (box 22 on the CMS-1500 or the claim frequency field in the 837P) with the **payer's original claim number**. The payer replaces the old claim with the new one.

## The frequency codes
- **1**: original claim.
- **7**: replacement of a prior claim (send the whole corrected claim, not only the changed line).
- **8**: void or cancel a prior claim (for example, billed to the wrong patient or payer).

## Tips
1. Use the payer's claim number from the remittance, not your own claim ID.
2. Include every line from the original claim, corrected; lines left off may be treated as voided.
3. Check the payer's corrected-claim deadline; it's often shorter than the original filing limit.
4. **Medicare Part B** handles most corrections through your MAC's **reopening** process (phone, portal or written request) instead.

## Sources
- Each payer's provider manual (corrected claim section)
- [CMS Medicare Claims Processing Manual, Chapter 34: Reopening](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/clm104c34.pdf)
