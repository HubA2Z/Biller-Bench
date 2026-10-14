# Denial Code Library files

Each `.md` file here becomes a **draft** page in the Denial Code Library on the next deploy (once per file).
Review and publish drafts from **Team queue → Denial code pages**. Publishing shows you as the reviewer.

Name files `co-97.md`, `pr-1.md`, `oa-18.md` and so on. Format:

```
---
code: 97                 # the reason code (CARC)
group: CO                # CO, PR, OA or PI: the group shown in the page name
category: coding         # patient, eligibility, coding, authorization, filing, cob, provider, documentation, limits, info
title: ...               # optional; defaults to "CO-97 Denial Code: Meaning, Causes and How to Fix It"
quick_answer: 2–3 sentences shown at the top of the page and in Google (60–600 characters).
related: 4, 16, 11       # other codes to link
---
## What it means
## Common causes        (numbered list)
## How to fix it        (numbered steps)
## Medicare vs. commercial payers   (table)
## Prevent it next time (bullets)
## Sources              (official links)
```

Rules: plain language in our own words (don't copy X12 or payer text beyond short quotes), no CPT descriptions,
no patient information, and every fact backed by an official source. If a file has a problem, the deploy log
says why and the file is retried on the next deploy. Editing a file after it's loaded has no effect; edit the
page in the Team queue instead.
