# WorkSphere - Complete Work Management SaaS

**Source package version:** 0.8.0-preview  
**Framework:** Next.js 15.5.28 / React 19.2.9 / TypeScript / Supabase  
**Status:** Substantial working-source implementation. **NOT a deployed or production-verified release.**

এই ZIP-এ একটি বাস্তব full-stack SaaS codebase রয়েছে। এটি কেবল UI mockup নয়: server-side command handlers, Supabase schemas/RLS policies, authentication, tasks, reviews, custom sections, SEO records, keyword import, topical maps, social records, calendar, file uploads and PDF reporting-এর code আছে। কিন্তু এই environment-এ npm registry/DNS এবং live Supabase credentials unavailable হওয়ায় `npm install`, production build, live database migrations, end-to-end test এবং deployment চালানো যায়নি। এগুলো যাচাই না করা পর্যন্ত software-কে production-ready বলা যাবে না।

## 1. Requirements

- Node.js 22 LTS (or a supported Node.js 20/22 runtime), npm
- A new Supabase project (Postgres, Auth and Storage enabled)
- A code editor (VS Code / Claude Code optional)
- GitHub + Vercel to deploy (optional until local verification)

## 2. Extract and start

```bash
unzip Complete_Work_Management_SaaS.zip
cd Complete_Work_Management_SaaS
npm install
cp .env.example .env.local
```

On Windows, create `.env.local` by copying `.env.example` manually or using PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Enter the public Supabase project URL and publishable/anon key into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Never** put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable. No live keys are included in this repository.

## 3. Setup database

In a **new Supabase project**, open SQL Editor and run these migrations **in order**:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_security_hardening.sql`
3. `supabase/migrations/003_membership_operations.sql`

Do not execute these on a production database without a backup and review. The policies assume a fresh project. `002` requires PostgreSQL 15+ (Supabase uses supported Postgres versions).

In Supabase **Authentication > URL Configuration** add:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password`

Enable email confirmation, password recovery and SMTP delivery. Set up Google OAuth and MFA in Supabase only when those flows are ready for verification.

The migrations create private `workspace-files` and `reports-private` buckets and row-level access rules.

## 4. Run the software

```bash
npm run dev
```

Visit `http://localhost:3000` -> Sign up -> Verify email -> Log in -> Create workspace -> Invite colleagues. A secure invite URL is displayed for manual sharing; automatic invite emails are **not** configured.

## 5. Validate before using real clients

```bash
npm run verify:syntax
node scripts/source-audit.cjs
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

Treat **any failed test or migration as a blocker**. Check `TEST_RESULTS.md` and `docs/QA_RUNBOOK.md` for the original verification status. The ZIP does not include `node_modules` or a generated lockfile because dependencies could not be installed in the generation environment. Generate and commit `package-lock.json` with npm on your own machine before production deployment.

## 6. What's implemented in source

- Public home, login, signup, password reset, Google OAuth integration and authenticator enrollment
- Profile editing, multiple workspaces, manual invitations, membership roles, ownership transfer and member removal
- Projects with private membership, tasks with checklists, comments, evidence, time worked and independent review via database RPC
- Custom sections, typed fields and records
- SEO activity logging and downloadable tables
- Keyword entry, CSV/XLSX import preview and validation, clustering fields and CSV export
- Interactive topical-map nodes and links with persisted positions
- Social account registry, manual content publishing statuses and calendar
- Account directory that stores vault *links* and metadata, not secret passwords
- Notifications, activity history, workspace search, dashboard charts
- Private file uploads/downloads and generated stored PDF reports

**Known omissions and restrictions:** Profile avatar/cover editing, account deletion/recovery automation, fine-grained customizable dashboards, advanced custom section views and formulas, full task time-entry ledger, automatic ranking/social posting/SEO data collection, production email delivery, durable distributed rate limiting, subscription billing and full automated E2E/integration security tests. These must be scoped, implemented and verified before saying that *all* original blueprint requirements are finished. See `docs/FEATURE_MATRIX.md`.

## 7. Deployment

Read `docs/DEPLOYMENT.md` for Vercel and Supabase instructions, production URLs, migration tests, rate limiting, backups, and smoke testing.

## 8. Development records

- `PROJECT_PROGRESS.md` — implementation status
- `PHASE_CHECKLIST.md` — phase tracking
- `TEST_RESULTS.md` — what was/was not tested
- `DECISIONS.md` — architecture decisions
- `docs/ORIGINAL_BLUEPRINT_BN.md` and `docs/ORIGINAL_PHASE_ROADMAP.docx` — original requirements

**Do not store client passwords or Google recovery codes in the account directory, task notes, reports, repository, logs or `.env.local`.**
