# BillerBench

Expert-answered medical billing Q&A for US practices. Providers ask claim, denial, CPT/ICD-10 and modifier questions; your in-house certified billers answer. Free public answers build search traffic; paid plans and urgent questions give private, faster answers; every answer page offers done-for-you billing services.

"BillerBench" is a working name. Change it in `src/app/layout.tsx` and the page copy.

## What's built

| Area | What it does |
|---|---|
| Accounts | Email + password sign-up for providers, signed session cookie, roles: Provider, Staff, Admin |
| Password reset | One-hour, single-use links (only a hash is stored). Resetting signs the account out on every other device and sends a "password changed" email |
| Email notifications | Asker: expert answer, team follow-up. Team: new paid or plan question, asker reply, new service request. Private question titles never appear in emails. Each user can turn notifications off |
| Rate limits | Login (per IP and per email), sign-up, reset requests, asking, replies, votes, PHI reports, service requests, NPI checks, suggestions. Stored in PostgreSQL, so it works across servers |
| NPI verification | Check-digit test, live lookup in the CMS NPPES Registry, auto-verify only when the registry name matches the account, otherwise staff review |
| Asking | Tags for codes (CPT/HCPCS/ICD-10 validated), modifiers, payer (Medicare by MAC, Medicaid by state, commercial, TRICARE, workers' comp), specialty, state, EHR. "Already answered?" suggestions while typing |
| Answer speed | Free (public, 3 business days), plan questions (private, quota per month), urgent ($29, 4 business hours). Deadlines count Mon–Fri 9–5 Eastern |
| No patient information | BillerBench never stores PHI. A scanner for SSN, Medicare ID (MBI), phone, 11-digit claim ID, full dates, addresses, emails and patient names blocks every question and reply, public or private. Every question needs a no-PHI confirmation. Checked in the browser and enforced on the server. "Report PHI" hides a post instantly |
| Team management | Admins add billers from **Team queue → Manage team members**: name, credentials, role, specialties, payers, software. The biller gets an email to set their own password. Admins can edit, resend invites, and turn accounts off (signs them out at once, keeps their answers) |
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

Create the first admin (you) once from the command line:

```bash
npm run make-staff -- ashim@yourdomain.com "Ashim" "CPC" --admin
```

It prints a temporary password. Sign in, change it with "Forgot your password?", then add the rest of your billers from **Team queue → Manage team members**.

## Email setup

1. Create a [Resend](https://resend.com) account, verify your sending domain, and create an API key.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (for example `BillerBench <notifications@yourdomain.com>`).
3. Optional: set `STAFF_ALERT_EMAILS` to send team alerts to a shared inbox instead of every team member.

Without `RESEND_API_KEY`, emails are printed to the server log, which is handy for testing reset links locally.

## Rate limits

Limits live in `src/lib/rate-limit.ts` (`LIMITS`). Per-IP limits read the first `X-Forwarded-For` address, which is correct behind Vercel, Render or a load balancer. If the app is reached directly with no proxy, set `TRUST_PROXY=false`; per-IP limits are then skipped and per-account limits still apply.

## Stripe setup

1. Create three recurring monthly prices in Stripe (Basic $49, Pro $149, Dedicated $299) and put their IDs in `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_DEDICATED`.
2. Set `STRIPE_SECRET_KEY` and set `DEV_FAKE_PAYMENTS=false`.
3. Add a webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Turn on the Customer Portal in Stripe settings so customers can switch or cancel plans.

Prices and plan limits live in `src/lib/plans.ts`.

## Deploy

Any Node host works (Vercel, Render, Railway, AWS, a VPS). Set the variables from `.env.example`, run `npm run db:migrate` on deploy, then `npm run build && npm start`.

**Before launch:**

- The site stores no patient information, so standard hosting works. Still use a managed PostgreSQL with automatic backups and HTTPS only.
- Terms of service must say users may not post patient information, and your team should remove any reported post quickly.
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
npm test           # PHI scanner, codes, NPI, business hours, markdown and email safety, URLs
npm run typecheck
npm run build
```

## Suggested next steps

1. Email address verification at sign-up.
2. Two-factor sign-in for team accounts.
3. US federal holidays in the business-hours clock (`src/lib/sla.ts`).
4. Staff assignment ("picked up by") so two billers don't answer the same question.
5. Answer review dates, so answers older than a year are flagged for re-checking.
6. Payer and code landing pages (for example "UHC telehealth billing") that collect related answers for SEO.

## Changelog

**v0.3**: no patient information anywhere (private questions and all replies are blocked too), team management page for admins with email invites, turn accounts off. Run `npm run db:migrate`; it adds `drizzle/0002_team_members.sql`.

**v0.2**: password reset, email notifications (Resend), rate limiting, notification settings. Run `npm run db:migrate` after updating; it adds `drizzle/0001_email_reset_ratelimit.sql`.

**v0.1**: first release.
