# QA Runbook — Production Exit Criteria

Run these tests on a STAGING Supabase project and preview deployment. Record screenshots, date, environment and actual results.

## Authentication and workspace

- [ ] Signup -> verification email -> login -> logout -> reset password.
- [ ] Google OAuth login (if configured), wrong callback rejected.
- [ ] MFA enrollment, failed code, verified code and later login step-up.
- [ ] Create Company A, Personal B and Company C; switch workspaces.
- [ ] Invite exact email, reject other emails, expired token, revoked token, and second use.
- [ ] Owner transfers ownership, removes member; ex-member loses access.

## Projects and task approvals

- [ ] Owner/admin/manager create project within allowed resources.
- [ ] Project private to User A is invisible to User B unless A grants access.
- [ ] Assign task, change status, submit evidence and time, add comment/checklist.
- [ ] Reviewer independent of creator and assignee can approve/ask for changes.
- [ ] Creator and assignee cannot approve own task by UI, API or direct data API.
- [ ] Direct UPDATE of tasks blocked; direct INSERT with status approved blocked.
- [ ] Removed member cannot edit task or download related evidence.

## Marketing modules

- [ ] SEO log saves true hours, URL and date and appears in filtered dashboard.
- [ ] Keyword manual entry; blank metrics stay null; disallowed URL fails.
- [ ] CSV quoting and XLSX import preview, duplicates, invalid metrics and export.
- [ ] Map: add pillar/supporting topic, link keyword, drag, connect, reload -> persists.
- [ ] Social account and content, published URL validation, scheduled content calendar.
- [ ] Nested sections, typed fields and records; other workspace cannot access IDs.

## Documents and reporting

- [ ] Private file upload and download under task, wrong MIME/size rejected.
- [ ] Month report counts match underlying tasks/SEO/social data.
- [ ] Member personal report does not include other employees' private data.
- [ ] Stored report URL is forbidden for other workspaces and unauthorized members.
- [ ] Production PDF generation and output opens without clipped text or missing page content.

## Quality/security release gates

- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` pass.
- [ ] SQL migrations run on clean staging database without errors.
- [ ] RLS/Storage deny SELECT/INSERT/UPDATE/DELETE across tenants.
- [ ] CSRF, XSS, SSRF, rate limits and upload security reviewed.
- [ ] No credentials appear in files, browser, telemetry, exports or PDF.
- [ ] Chrome/Firefox/mobile responsiveness and keyboard access reviewed.
- [ ] Backups, retention policy, restore rehearsal and deployment rollback documented.
