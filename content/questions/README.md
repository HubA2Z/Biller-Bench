# Common questions (Q&A seed files)

Each `.md` file here becomes a **draft** "common question" with its expert answer on the next deploy (once per file).
Review and publish them from **Team queue → Q&A drafts**. The answer is credited to `CONTENT_AUTHOR_EMAIL`
(or the first admin), and the question is shown as "Common question · answered by the BillerBench team".

Format:

```
---
title: Why did Medicare deny 99214 with CO-97 when billed with 20610?
codes: 99214, 20610
payer_group: Medicare          # Medicare, Medicaid, Commercial, TRICARE, Workers' Comp, General
payer_name: All jurisdictions  # a value from that group, e.g. "All payers" for General
state: US                      # US for all states, or a two-letter state
specialty: Primary Care
---
# Question
The question as a reader would ask it.

# Answer
The expert answer in Markdown, ending with official sources.
```

Never include patient information, real practice names or anything copied from a payer or AMA source.
