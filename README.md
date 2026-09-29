# BillerBench

Expert-answered medical billing Q&A for US practices. Providers ask claim, denial, CPT/ICD-10 and modifier questions; your in-house certified billers answer. Free public answers build search traffic; paid plans and urgent questions give private, faster answers; every answer page offers done-for-you billing services.

"BillerBench" is a working name. Change it in `src/app/layout.tsx` and the page copy.

## What's built

| Area | What it does |
|---|---|
| Accounts | Email + password sign-up for providers, signed session cookie, roles: Provider, Staff, Admin |
| NPI verification | Check-digit test, live lookup in the CMS NPPES Registry, auto-verify only when the registry name matches the account, otherwise staff review |
| Asking | Tags for codes (CPT/HCPCS/ICD-10 validated), modifiers, payer (Medicare by MAC, Medicaid by state, commercial, TRICARE, workers' comp), specialty, state, EHR. "Already answered?" suggestions while typing |
| Answer speed | Free (public, 3 business days), plan questions (private, quota per month), urgent ($29, 4 business hours). Deadlines count Mon–Fri 9–5 Eastern |
| PHI guardrails | Scanner for SSN, Medicare ID (MBI), phone, 11-digit claim ID, full dates, addresses, emails, patient names. Blocks public posts, warns on private ones (covered by BAA). Checked in the browser and enforced on the server. "Report PHI" hides a post instantly |
| Question pages | Public: `/q/[code]/[payer]/[slug]` with QAPage structured data, canonical URLs, sitemap, noindex until answered. Private: `/p/[id]`, visible only to the asker and staff |
| Answers | Staff post expert answers or follow-ups; askers post follow-ups and mark a solution; helpful votes; safe Markdown with LCD/NCD/NCCI link buttons |
| Money | Stripe Checkout for plans (subscriptions) and urgent questions (one-time), webhook, billing portal. Service request form (appeals, audits, AR recovery, full billing) on every answered question |
| Team queue | Open questions by due time, overdue count, plan revenue, service requests (contacted/won/lost), PHI reports (restore/remove), NPI review |

## Run it locally

Needs Node 20+ and Docker (or any PostgreSQL 14+).

```bash
cp .env.example .env            # then set AUTH_SECRET: openssl rand -base64 32
docker compose up -d            # starts PostgreSQL
npm install
npm run db:migrate
npm run db:seed                 # optional sample data
npm run dev                     # http://localhost:3000
```

Sample logins after seeding:

- Team: `marcus@billerbench.test`, `denise@billerbench.test` (admin), `tom@billerbench.test`, password from `SEED_STAFF_PASSWORD`
- Providers: `priya@example.test` (Basic plan), `linda@example.test` (Pro), `ray@example.test` (Free), password `provider-demo-1`

With `DEV_FAKE_PAYMENTS=true` and `APP_URL` on localhost, checkouts succeed without Stripe so you can test the whole flow.

Add a real team member:

```bash
npm run make-staff -- ashim@yourdomain.com "Ashim" "CPC"
```

## Stripe setup

1. Create three recurring monthly prices in Stripe (Basic $49, Pro $149, Dedicated $299) and put their IDs in `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_DEDICATED`.
2. Set `STRIPE_SECRET_KEY` and set `DEV_FAKE_PAYMENTS=false`.
3. Add a webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Turn on the Customer Portal in Stripe settings so customers can switch or cancel plans.

Prices and plan limits live in `src/lib/plans.ts`.

## Deploy

Any Node host works (Vercel, Render, Railway, AWS, a VPS). Set the variables from `.env.example`, run `npm run db:migrate` on deploy, then `npm run build && npm start`.

**Before real patient data touches it (private questions):**

- Use HIPAA-eligible hosting and database with a signed BAA from the provider (for example AWS, Google Cloud or Azure with a BAA, or Aptible). Standard Vercel/Render plans are not covered.
- Sign a BAA with each paying practice. Add BAA acceptance to plan checkout.
- Turn on encrypted backups, database encryption at rest, and access logging.
- Get a US healthcare attorney to review the terms of service and answer disclaimer.
- Only show code numbers, not CPT descriptions, unless you license CPT content from the AMA.

## Project layout

```
src/app/            pages and routes (App Router)
src/app/actions/    server actions: auth, questions, answers, billing, leads, team, account
src/components/     UI (AskForm, AnswerForm, QuestionView, …)
src/db/             Drizzle schema and client
src/lib/            PHI scanner, codes, NPI, business-hours SLA, plans, markdown, queries
drizzle/            SQL migrations (npm run db:generate after schema changes)
scripts/            migrate, seed, make-staff
tests/              unit tests (npm test)
```

## Checks

```bash
npm test           # PHI scanner, codes, NPI, business hours, markdown safety, URLs
npm run typecheck
npm run build
```

## Suggested next steps

1. Email: password reset, "your question was answered" notifications, and alerts to staff for urgent questions (Resend or Postmark).
2. Rate limiting on sign-up, login and posting.
3. US federal holidays in the business-hours clock (`src/lib/sla.ts`).
4. Staff assignment ("picked up by") so two billers don't answer the same question.
5. Answer review dates, so answers older than a year are flagged for re-checking.
6. Payer and code landing pages (for example "UHC telehealth billing") that collect related answers for SEO.
