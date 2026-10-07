# Update inbox

Every `.md` file in this folder is loaded into BillerBench on the next deploy and appears under
**Team queue → Articles and updates**. Files starting with `_` are ignored (see `_TEMPLATE.md`).

Rules:

- Name files `YYYY-MM-DD-short-name.md`, e.g. `2026-10-12-g2211-modifier-25.md`.
- Each file is imported **once**. Editing the file later does nothing; edit the article on the site instead.
  Deleting the article on the site doesn't bring it back.
- Updates come in as **drafts**. They go live only when an admin clicks Publish, unless the file says
  `status: published` **and** the Vercel setting `CONTENT_AUTOPUBLISH` is `true`.
- A file with a mistake (unknown code or payer, missing summary, patient details) is skipped and
  the reason is printed in the Vercel build log. Fix the file and it's retried on the next deploy.
- Never include patient information.
