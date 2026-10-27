# Deployment Guide - Supabase + Vercel

## Step A: New Supabase project

1. Create a Supabase Cloud project in the desired region.
2. Use a new project. Record its Project URL and public publishable key.
3. Apply `001_initial.sql`, then `002_security_hardening.sql`, then `003_membership_operations.sql` from `supabase/migrations/` via SQL Editor.
4. Review the result in Database > Tables and Security Advisor: all workspace-owned tables must have RLS enabled.
5. Confirm private Storage buckets `workspace-files` and `reports-private` exist.
6. In Authentication, enable email/password and confirmation. Configure reliable SMTP (test email verification and password reset).
7. For OAuth, configure Google Cloud client, allowed domains and the Supabase callback. Update Auth Site URL and Redirect URLs to match production and preview sites.
8. For MFA, enable TOTP and test enrolling/challenging/un-enrolling with a non-privileged account.

## Step B: Local developer verification

```bash
npm install
npm run verify:syntax
node scripts/source-audit.cjs
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
```

In `.env.local`, use only Supabase public client credentials. Keep privileged service credentials in server-only storage if ever needed; this starter does not require one for normal operations.

## Step C: Multi-tenant smoke test (mandatory)

1. Signup User A, verify email, create Workspace A.
2. Signup User B, verify email, create Workspace B.
3. User A creates a private project, task and social content.
4. User B must not see Workspace A URLs, projects, accounts, files or reports by changing URL slug/ID, calling API, requesting Storage paths or using direct SQL queries under their JWT.
5. Invite User C to A with exact-match email; confirm link works once, expires, and cannot be accepted by a different email.
6. Assign User C a task. Confirm C submits evidence, but C cannot approve their own task, and creator cannot approve it.
7. Owner grants one account-directory entry to C. Confirm other members cannot access that entry or its vault metadata. Remove C and confirm the grant no longer works.
8. Build a topical map and save/refresh positions and connections; verify data persistence.
9. Upload evidence. Download as an authorized member only. Check a different workspace's signed/download URLs fail.
10. Generate personal and workspace PDF reports, verify real numbers and access restrictions, download stored report.
11. Run rejected input tests (malicious URLs, oversized files, duplicate keywords, invalid task transitions, invalid RLS relationships).

## Step D: Vercel deploy

1. Push this project to a private GitHub repository **without `.env.local`**, copied customer data or credentials.
2. In Vercel create a new project from the repository.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL` as environment variables for appropriate environments.
4. Configure the production site URL, Auth callback and OAuth origins for your domain.
5. Verify `npm run build` succeeds in Vercel. Do not deploy unverified artifacts as production.
6. Configure HTTPS domain and secure headers. Check cookies and Auth refresh across reloads.
7. Turn on backups, log monitoring with secret redaction, rate limiting, SMTP delivery and a documented rollback plan.
8. Set a scheduled process for deadline reminders **only if** you later implement one; in-app notifications for existing activity do not provide background reminders.

## Security/performance release blocks

- Replace best-effort in-memory request throttle with distributed durable rate limiting.
- Audit authorization rules and explicitly test private projects, nested sections, storage access, generated reports and RLS.
- Pin dependency versions with a committed lockfile; run `npm audit` and review patched security versions before production.
- Verify monthly PDF output on actual Vercel runtime, including Unicode limitations (`pdf-lib` built-in fonts substitute unsupported characters).
- Test report generation/Storage size, large uploads, concurrent saves and rollback/recovery.
- Obtain a security assessment before using the platform for confidential client account metadata.
