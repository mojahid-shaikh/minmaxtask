# Work Management Platform — Complete Development Blueprint

**সংস্করণ:** 1.0  
**ডকুমেন্টের উদ্দেশ্য:** দেওয়া Master Prompt-কে বাস্তব, production-ready SaaS সফটওয়্যার তৈরির জন্য কাজের ক্রম, system architecture, database design, security plan, delivery gates এবং acceptance criteria-তে রূপান্তর করা।  
**বর্তমান অবস্থা:** এটি implementation blueprint; এই ডকুমেন্ট নিজে runnable software নয়।

---

## 1. Product Goal ও Scope

একটি **multi-tenant Work Management SaaS** তৈরি করতে হবে, যেখানে আলাদা ব্যবহারকারী নিজের প্রোফাইল ও personal/company workspace পরিচালনা করবে। প্রথমে ৩ জনের টিম ব্যবহার করতে পারবে; ভবিষ্যতে একাধিক প্রতিষ্ঠান ও অনেক ব্যবহারকারী যোগ করা যাবে।

**Release scope (কোনোটিই বাদ নয়):**

1. Public website, signup, login, email verification, recovery, Google OAuth, MFA, account deletion।
2. Customizable personal profiles এবং user preferences।
3. Multiple isolated workspaces, invitations, roles and granular permissions।
4. Projects, task lists, checklists, submissions, evidence, approvals, comments and histories।
5. No-code custom sections, nested sections, custom field types, records and saved views।
6. SEO activity tracking, website work and reusable checklists।
7. Keyword research with manual entry, CSV/XLSX imports, filtering and export।
8. Interactive topical maps with linked keywords, nodes and edges।
9. Social media content tracking, content status, content calendar, video records।
10. Secure account directory storing **vault references, never passwords**।
11. Notifications, authorized search, activity and audit logs।
12. Personal and owner dashboards using real data; customizable widgets and views।
13. Professional monthly PDF reporting with access controls and download/preview।
14. Accessible responsive UI, tests, performance optimization and Vercel deployment readiness।

**স্পষ্টভাবে scope-এর বাইরে (পরবর্তীতে আলাদাভাবে নির্ধারণ করা যাবে):** subscription billing, automatic SEO data collection, automatic social media API posting, full password manager, automated Google ranking tracking। এগুলো না থাকাকে মূল requirements বাস্তবায়নের বিকল্প হিসেবে দেখানো যাবে না।

---

## 2. প্রযুক্তি ও Architecture Decision

| Layer | Recommended technology | ব্যবহার |
|---|---|---|
| Web framework | Next.js App Router + React + TypeScript strict | SSR, pages, Server Actions, Route Handlers |
| Design | Tailwind CSS, shadcn/ui, Radix, Geist, Lucide | Premium UI, accessibility |
| Data/backend | Supabase PostgreSQL | Relational, structured records, transactional data |
| Login | Supabase Auth + `@supabase/ssr` | Cookie-backed sessions, email/password/OAuth/MFA |
| Data security | PostgreSQL RLS + server-side authorization | Workspace and resource isolation |
| File storage | Supabase Storage | Private attachments, screenshots, avatars and reports |
| Forms | React Hook Form + Zod | Client and server validation |
| Tables | TanStack Table | Custom table UI, filters, views |
| Graphs | Recharts | Genuine data analytics |
| Topical map | `@xyflow/react` (React Flow) | Draggable topic nodes and links |
| Data transfer | Maintained CSV and XLSX libraries | Import/export with validation |
| PDF | Compatible pure-JS server-side PDF renderer, e.g. `@react-pdf/renderer` | Vercel-compatible PDF generation, without headless browser binaries |
| Test | Vitest, Testing Library, Playwright, SQL/RLS tests | Unit, component, integration and E2E |
| Hosting | Vercel + Supabase Cloud | Preview, production, secure environment variables |
| Repo | GitHub | Version control, branch review, CI |

**Version policy:** শুরুতে package compatibility যাচাই করে exact versions ও lockfile commit করতে হবে। Next.js version অনুযায়ী cookie refresh `proxy.ts` বনাম পুরোনো `middleware.ts` নির্বাচন করতে হবে।

### Data flow

`Browser → Next.js Server Actions / Route Handlers → Auth identity + authorization → PostgreSQL (RLS) / Storage → Result`

**Design principle:** Read operations server components/services দিয়ে; writes-এ authenticated mutation, Zod validation, membership/permission check, database constraints এবং activity recording। শুধু UI-তে button hide করা authorization নয়।

---

## 3. Main Users এবং Access Rules

- **Owner:** Workspace settings, membership, ownership transfer, all authorized projects, approvals, analytics, account-directory policy and reports।
- **Admin:** Assigned administrative settings, project/section/member management and reviews within granted permission।
- **Manager:** Assigned projects/tasks, team work review, approval if permission granted।
- **Member:** Assigned/authorized tasks and sections, own work submission, permissible comments and records।

**Permissions must be both role- and resource-aware.** A manager cannot automatically read every project or account record. Workspace membership alone is not sufficient to view private sections or credentials metadata. Prevent self-approval where an independent reviewer is required, with explicit policies for exceptions.

### Default permission examples

| Action | Owner | Admin | Manager | Member |
|---|---|---|---|---|
| Workspace settings/ownership | Full | Scoped | No | No |
| Invite/remove people | Full | Granted only | No by default | No |
| Create/manage project | Full | Yes | Assigned/granted | No by default |
| Create custom section | Full | Yes | Granted | Granted |
| Create/update own authorized task | Yes | Yes | Yes | Within assignment |
| Review/approve submission | Yes | Granted | Granted | No by default |
| Read account directory | Policy-driven | Policy-driven | Explicit grant | Explicit grant |
| Read workspace-wide reports | Yes | Granted | Scoped | Own/authorized only |

All matrix cells are server-enforced; product settings may narrow permissions further.

---

## 4. Required Screens (Sitemap)

**Public:** `/`, `/features`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/privacy`।

**Account:** `/onboarding`, `/profile`, `/profile/edit`, `/settings/account`, `/settings/security`, `/settings/appearance`, `/settings/notifications`, `/workspaces`, `/workspaces/new`।

**Workspace:** `/w/[workspaceSlug]/dashboard`, `/my-tasks`, `/projects`, `/seo`, `/keywords`, `/topical-maps`, `/social-media`, `/calendar`, `/reports`, `/accounts`, `/team`, `/activity`, `/sections/[sectionId]`, `/settings`।

**Shared UX:** workspace switcher; collapsible nested sidebar; breadcrumbs; Ctrl/Cmd+K; global search; notifications; quick-create; task side drawer; saved filter views; skeleton/empty/error/unauthorized states; light/dark mode; tablet/mobile drawer; Bengali-capable font fallback।

---

## 5. Database Blueprint (Logical Schema)

**Core rule:** Each workspace-owned row contains `workspace_id` and receives matching RLS policies, foreign keys, indexes and permission checks. Cross-workspace references must be rejected by composite constraints or validated transactional operations.

### Identity and organization
- `profiles`: `user_id PK`, username unique, name, title, bio, about, skills, links, profile visibility, avatar/cover references, timezone, language।
- `user_preferences`: per-user theme, notifications, sidebar and dashboard preferences।
- `workspaces`: id, owner/creation metadata, name, slug unique, logo, description, time zone, industry and appearance।
- `workspace_members`: `(workspace_id,user_id)` unique, role, membership status and timestamps।
- `workspace_invitations`: workspace, invited email, intended role, **hashed token**, expiry, inviter, status।
- `permissions`, `project_members`, `section_permissions`: resource grants and role restrictions।

### General work
- `projects`: workspace, name, description, client/website context, status, dates and ownership।
- `sections`: workspace, project, `parent_section_id`, name, kind, order, icon, color, visibility and archive status।
- `section_templates`, `section_fields`: field definition, type, options, validation, required flag, sort order।
- `section_records`: workspace, section, typed core metadata plus `values JSONB`; strong validation, searchable fields and indexes।
- `record_relationships`, `saved_views`, `record_attachments`: related records, filters and presentation preferences।
- `task_status_definitions`: workspace-configurable workflow choices and legal transitions।
- `tasks`: workspace, project, section, title, description, assignee, author, status, priority, dates, estimate, actual time।
- `task_checklist_items`, `task_comments`, `task_evidence`, `task_status_history`, `task_reviews`: subtasks/checklists, review snapshots, decisions, attachments, URLs and history।

### SEO, research and content
- `websites` (recommended): project-related website metadata and domain identity।
- `seo_work_records`: category, site, task, description, completion date, live URL, reviewers and evidence।
- `keywords`, `keyword_clusters`, `keyword_cluster_members`: keyword, location, intent, volume, KD, CPC, URL, status, source, notes; all external metrics nullable and source-attributed।
- `topical_maps`, `topical_map_nodes`, `topical_map_edges`, `topic_keyword_links`: pillar/subtopic graph, positions, content status, relationships and research links।
- `social_accounts`, `social_content`: platform, social account, content type, caption/title, thumbnail, scheduling/publish dates, URL and **publication_status**।
- `calendar_entries`: references to existing task/SEO/social content; avoids disconnected calendar-only copies।

### Operations and governance
- `account_directory`, `vault_references`: site/email/username and access metadata; safe vault pointer only; **no secret values**।
- `attachments`: workspace, path, type, size, uploader, visibility, resource reference, deletion lifecycle।
- `notifications`, `notification_preferences`।
- `activity_events`, `security_audit_events`: actor, event, sanitized summary, resource, timestamp; restricted immutable writes।
- `report_configs`, `reports`: workspace, type, filters, period, generated-by, storage path, generated-at and immutable report metadata।
- `import_jobs` (recommended): upload, mapping, validation errors, completed/failed record count and status।

### Integrity requirements
1. Primary/foreign keys, not-null constraints and unique `(workspace_id,id)` where needed for composite FKs।
2. `created_at` and `updated_at`, plus archive/soft-delete where recovery matters।
3. Index commonly filtered `(workspace_id, project_id, status_id, due_at)` columns and keyword search keys।
4. Postgres full-text search/GIN for searchable text and selected JSONB, **with permission filtering**।
5. Prevent nested section parent cycles and disallow linking records from two different workspaces।
6. Never trust a `workspace_id`, `assignee_id`, `role` or storage path supplied by the browser without re-validation।
7. No one-size-fits-all EAV for every query; use normalized stable entities and JSONB for custom field values, with robust field definitions.

---

## 6. Core End-to-End Workflows

### A. New account to workspace
Visitor signs up → verifies email → logs in → creates/edits profile → creates personal or company workspace → becomes owner → invites members → invite email token checked, accepted by correct identity → role recorded → workspace accessible.

### B. Team task and approval
Owner/manager creates project → creates/assigns task → member moves it to In Progress → submits update with work description, live URL and evidence → status becomes Submitted for Review → authorized reviewer either requests changes or approves → approval/deadline/time history recorded → approved/completed counts appear in real dashboard and reports.

**Two independent statuses:** `tasks.workflow_status` controls review lifecycle; `social_content.publication_status` records Draft/Scheduled/Published/Failed etc. Published ≠ Approved.

### C. Dynamic section builder
Create section → choose template/view → define field types and validations → add records → edit columns, filters and views → preserve data across Table/Kanban/Calendar views → enforce nested permissions → import/export records.

**Formula fields:** use an allowlisted expression parser with cycle detection; never execute user formulas as JavaScript or SQL.

### D. Keyword to topical map
Create/import keywords → preview mappings and duplicates → validate and store genuine supplied metrics → group clusters → create pillar/supporting topic nodes → link keywords and nodes → save positions and edges → display same data in table and visual map.

### E. Social and calendar
Connect *records* for social accounts (not automatic API posting) → draft/schedule/record published content → store live URLs and file evidence → display calendar entries tied to source records → report published count by chosen dates.

### F. Secure account directory
Owner grants restricted access → staff views safe account metadata and an authorized external vault link → directory access/modification audited; no passwords or recovery codes saved in DB, printed in PDFs or logged.

### G. Monthly report
Authorized user chooses workspace/month/employees/projects/types → server validates access → queries genuine records → generates branded multipage PDF → optionally previews → stores private report object and metadata → user downloads via authenticated route/signed short-lived URL.

---

## 7. Build Order — Step-by-Step Implementation Plan

**Rule: Every step includes frontend + backend + schema + validation + authorization + error states + tests.** A feature is not complete just because its page is visible.

### Step 0 — Requirements freeze, wireframes, backlog (1–2 weeks)
- Turn all requirements into tracked epics, user stories and acceptance tests.
- Define exact task lifecycle and permission matrix; confirm owner/admin/manager/member actions.
- Draw page map, primary user journeys, component library, database entity relation diagram and UX wireframes.
- Choose naming, app logo placeholder that can be replaced, UI tokens and reporting examples.
- **Gate:** PRD, UX map, ERD, permission matrix and prioritized backlog approved.

### Step 1 — Engineering foundation and UI shell (1–2 weeks)
- Initialize Next.js/TypeScript repo, lint/test/build scripts, lockfile, consistent folder structure, environment validation.
- Build design tokens (light/dark), layout, reusable forms, tables, cards, buttons, error/empty states, dialogs and drawer.
- Set up Git workflow and preview deployments, logging/error monitoring foundation.
- **Gate:** Responsive dashboard shell renders; CI lint/typecheck/tests/build pass.

### Step 2 — Database, auth, security and tenant layer (2–3 weeks)
- Implement migration set, basic workspace tables, FKs, indexes and grants/RLS.
- Supabase Auth email/password, verification, recovery, login/logout, optional OAuth and MFA.
- Cookie-based SSR session helpers and secure auth callback; browser client never receives service key.
- Centralized `requireUser`, `requireWorkspaceMember`, `can(resource,action)` access helpers.
- Add baseline RLS tests, two-workspace denial tests, storage policies.
- **Gate:** Unauthenticated users cannot enter protected pages; cross-workspace reads/writes fail in both app and SQL tests.

### Step 3 — Profiles, workspaces and invitations (1–2 weeks)
- Profile editor: avatar, cover, bio, skills, links, privacy, timezone, theme and security settings.
- Workspace create/edit/switch, member directory, invitation/accept/revoke/remove, role changes, ownership transfer.
- Handle invitation expiry, replay protection, email identity checks and last-owner invariant.
- **Gate:** Three real test users can register, join by invitation, switch workspaces and see only permitted resources.

### Step 4 — Projects, section builder and task workflows (3–5 weeks)
- Build projects and members, nested sections and drag/reorder.
- Dynamic fields: text, number, date, URL, select, multi-select, status, user, relation, file and safe formulas.
- Record CRUD, views (table/list/kanban/calendar/gallery), sorting, filters, resize, archive, permissions and CSV/XLSX import/export.
- Tasks: assignment, checklists, subtasks, time entries, comments, evidence, task drawer and configurable status workflow.
- Review queue with approve/request-changes, history and transactional audit events.
- **Gate:** Authorized member can create custom field + record and submit a task; authorized reviewer can approve; unauthorized reviewer cannot.

### Step 5 — SEO, keywords and topical maps (3–4 weeks)
- SEO activity catalog, website details, live-link submission and checklists.
- Keyword data model, type validation, bulk import (preview, mapping, dedup, error rows), CSV/XLSX exports, grouping/filtering.
- React Flow nodes/edges with autosave, zoom, minimap, keyword linking, table view and graph consistency.
- **Gate:** Imported keyword retains original data/source; topic map persists all connections and coordinates after logout/login.

### Step 6 — Social media, calendar, account directory and files (2–3 weeks)
- Social account registry, social content, drafts/schedules/published tracking, platform/employee filters and thumbnails.
- Calendar week/month/list with task and content source references, authorized drag-rescheduling.
- Account directory, external vault reference workflow and sensitive-access auditing.
- Private file storage, safe URL/attachment validation, upload progress, deletion and signed downloads.
- **Gate:** Published URL is recorded, calendar is synchronized, private file access denied to wrong workspace, no credentials stored.

### Step 7 — Activity, notifications, search and dashboards (2–3 weeks)
- In-app notifications: assignment, comment, deadline, approval, correction and invites.
- Activity feed/audit events, global permission-filtered search, keyboard command menu.
- Personal and owner dashboards: KPI queries, charts, role-sensitive filters and saved widget preferences.
- Real data only; show empty state if there are no records.
- **Gate:** An action updates appropriate KPI/notification history with correct user/project filters; no cross-tenant search leakage.

### Step 8 — PDF reports and export pipeline (1–2 weeks)
- Report configuration and filter access validation; combined, SEO, social, employee, project and section templates.
- PDF: company branding, executive summary, real KPIs, tables, hyperlinks, page breaks, page numbers and generation date.
- Protect preview/download with private storage/short-lived access; save immutable report metadata.
- **Gate:** A report matches the chosen underlying work records; unauthorized users cannot obtain it; actual Vercel runtime verified.

### Step 9 — Hardening, final QA and deployment (2–4 weeks)
- Comprehensive SQL/RLS, unit, component, integration and Playwright E2E coverage.
- Security review: auth/session, membership, CSRF, rate limiting, SSRF, storage access, privilege changes and destructive actions.
- Performance test: large tasks/keywords, pagination, indexed search, graph loading, imports, report file size.
- Accessibility and responsive QA; migrations and rollback/backup rehearsal.
- Deploy to preview and production via GitHub/Vercel and Supabase; verify domains, callbacks and smoke tests.
- **Gate:** Production build passed; end-to-end tests executed; no unresolved critical issues; rollback and runbook documented.

**সময়সীমা:** ওপরের সময়গুলো একটি আনুমানিক planning range, প্রতিশ্রুতি নয়। একটি ছোট experienced development team-এর জন্য কার্যপরিধি/parallel work/QA অনুযায়ী মোট প্রায় **18–28+ সপ্তাহ** লাগতে পারে। Complete release-এর সব feature gate পার হতে হবে; মাঝপথের review builds-কে finished production product বলা যাবে না।

---

## 8. Repository Structure (Target)

```text
work-management-platform/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (account)/
│   ├── (workspace)/w/[workspaceSlug]/
│   └── api/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── auth/ profiles/ workspaces/ permissions/
│   ├── projects/ sections/ records/ tasks/
│   ├── seo/ keywords/ topical-maps/ social/
│   ├── calendar/ accounts/ notifications/
│   └── analytics/ reports/ search/
├── lib/
│   ├── supabase/   # server, browser, session helpers
│   ├── authz/      # shared access checks
│   ├── validation/ # schema and sanitization
│   └── storage/    # private file access
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── .env.example
├── package.json
├── README.md
└── DEPLOYMENT.md
```

Production-only environment variables remain server-only. Document `.env.example` keys such as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_URL`, and any **server-only** administrative credentials if strictly required. OAuth provider secrets belong in their appropriate provider/Supabase configuration; never commit real values. Avoid depending on a service-role key for ordinary user queries.

---

## 9. Performance and Reliability Checklist

- Server-side pagination for keywords, sections and tasks; expensive sort/filter in SQL, not all records in browser.
- Indexed workspace/project/status/due-date queries and permissions, `EXPLAIN ANALYZE` for slow queries.
- Debounced search; only load React Flow and heavy analytics when required.
- Stable import jobs in chunks with preview, progress, idempotency and error downloads.
- Avoid generating huge PDFs in browser; use protected server-side route/worker strategy compatible with configured Vercel limits.
- Keep structured business data in PostgreSQL; Storage holds files, never unvalidated public links to private attachments.
- Use centralized logging with secret redaction; minimize sensitive data retention.
- Automated backup/restore test and retention policy; migration rollback plan.
- Handle expired invitation, revoked membership, deleted attachment, unavailable URL and concurrent edits gracefully.

---

## 10. Security Checklist (Release Blocking)

1. Auth verification and session handling on every protected server path.
2. RLS on every exposed workspace-owned table; correct grants as well as policies.
3. Cross-workspace denial tests for SELECT/INSERT/UPDATE/DELETE and storage.
4. Enforced project/section/account-directory authorization.
5. Nonforgeable invitations (hashed tokens, expiration, single use, matching email).
6. Rate limit signup/login-adjacent endpoints, imports, invites, URL checks and reports.
7. Safe file MIME/size checks, bucket privacy, signed URLs, upload cleanup.
8. External URLs constrained to safe schemes; any server-side fetching blocks internal/private networks and redirects that bypass checks (SSRF).
9. Validate/sanitize rich text and user-generated links; safe rendering, CSRF defenses.
10. Audit log changes; redact credentials/recovery information, use restricted log writer.
11. Vault references only: no stored plaintext passwords or recovery codes.
12. Service-role/server secrets never shipped to client, Git, logs, PDFs or exports.
13. Owner transfer and account deletion require reauthentication/confirmation and preserve last-owner constraints.
14. Security audit/external compliance must not be claimed unless actually performed.

---

## 11. QA Test Matrix and Definition of Done

### Mandatory E2E scenarios

- Register → verify email → login → logout → reset password.
- Google OAuth and MFA when configured.
- Edit full profile + upload avatar/cover + privacy settings.
- Create workspace → invite member → accept → role access → revoke.
- Create project and nested section → add typed field → create/edit/search/filter records.
- Table/Kanban/Calendar views persist same record; CSV/XLSX import/export works.
- Create, assign, comment, attach evidence, submit, request changes, approve task.
- Record SEO update with live URL and reviewer visibility.
- Import keywords with duplicate/error handling; create topics and link research; graph persists.
- Record social post and publish URL; calendar stays synchronized.
- Account-directory permissions and safe vault reference access; no secrets exported.
- Monthly report preview → PDF download → verify real counts and hyperlinks.
- Search and dashboards show permitted, genuine records.
- User A in Workspace A cannot read/edit Workspace B data via page/API/DB/storage path.
- Desktop, tablet and mobile views; keyboard navigation and error states.

### Definition of done for **each** module

- [ ] Functional UI, including loading/empty/error states.
- [ ] Real database CRUD with migrations and constraints.
- [ ] Validated inputs and permission-enforced server mutation.
- [ ] RLS/grants and storage policies tested, including denial cases.
- [ ] Successful and failed workflows covered by automated tests.
- [ ] Accessibility, responsive and large-data behavior checked.
- [ ] Documentation and release notes updated.
- [ ] Reviewer has verified feature in a real preview environment.

**Final acceptance:** All user-facing acceptance workflows from the Master Prompt work end to end; `typecheck`, `lint`, relevant `test`, `build` and migrations pass; real Supabase/Auth/Storage and Vercel smoke tests have been executed. Do not claim success for tests not actually run.

---

## 12. Deployment Blueprint (Vercel + Supabase)

1. Create separate development and production Supabase projects or clearly isolated environments.
2. Apply versioned SQL migrations and seed only labelled test data in non-production.
3. Enable RLS, grants, database tests and private Storage buckets/policies.
4. Configure Auth redirect URLs, email verification, recovery URLs and required transactional email delivery.
5. Configure Google OAuth provider (when included) and MFA enrollment flows.
6. Create `.env.example`; set real production credentials in Vercel/Supabase configuration, not source files.
7. Push repository to GitHub; enforce checks for pull requests.
8. Create Vercel project; bind repo; configure preview and production environment variables.
9. Verify domain/DNS/HTTPS and callback URLs in production.
10. Run production build, smoke tests, login/invite, upload/download, cross-tenant denial and live PDF generation.
11. Document release rollback, migration recovery, monitoring and backups.
12. Deliver source ZIP, README, deployment guide, DB migrations, tests and an honest test/deployment report.

---

## 13. Suggested Project Board (Epics and Checkpoints)

| Priority | Epic | Dependency | Acceptance artifact |
|---|---|---|---|
| P0 | Requirements, ERD, wireframes, roles | None | Approved PRD + UX map |
| P0 | Framework, UI shell, CI | P0 design | Working shell + successful build |
| P0 | Auth, tenant isolation, RLS | DB | Auth test + cross-tenant denial |
| P0 | Profile, workspaces, invitations | Auth | 3-user invitation test |
| P0 | Projects, dynamic sections, tasks, approvals | Tenant access | CRUD + review flow tests |
| P1 | SEO and keyword management | Core work model | Work URL + import test |
| P1 | Topical maps | Keywords | Persistent nodes/edges test |
| P1 | Social media + calendar | Core work model | Tracked publication record test |
| P1 | Account directory + attachments | Auth/RLS | Private access tests |
| P1 | Notifications, audit, search | All major write models | Permission-filtered history/search |
| P1 | Owner analytics | Established work data | Reconciled KPI dashboard |
| P1 | PDF report generator | Data queries + authorization | Matching multi-page PDF test |
| P0 release blocker | Security, E2E, perf, deployment | All above | Verified production smoke test |

**Priority অর্থ:** P0 = dependency/launch blocker; P1 = required full-scope feature implemented after its dependencies. P1 মানে optional নয়।

---

## 14. Next Immediate Execution Instructions for Developers

**প্রথম development sprint**-এ এই নির্দিষ্ট output তৈরি করতে হবে:

1. Version-pinned Next.js strict TypeScript application with committed lockfile, CI scripts and design tokens.
2. Public auth pages and functioning cookie-backed Supabase identity layer.
3. Initial migrations: `profiles`, `user_preferences`, `workspaces`, `workspace_members`, `workspace_invitations`, core grants and RLS tests.
4. `requireUser`, `requireWorkspaceMember`, and permission-check service with tests.
5. Premium responsive workspace shell, onboarding and workspace creation.
6. Three real test-user setup instructions and an automated cross-workspace denial test.
7. README, `.env.example`, and instructions for local Supabase setup.

**এই sprint-এর acceptance:** Sign up → verification → profile edit → workspace creation → invite → login → access denial between workspaces works with real Supabase, not mocked user data. এর পরে dynamic section + tasks implementation শুরু করা হবে।

---

## 15. Reference Documentation (Technical Validation)

- Supabase Auth SSR / Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- Supabase PostgreSQL RLS/grants/testing: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage policies: https://supabase.com/docs/guides/storage/security/access-control
- Vercel deployment environments: https://vercel.com/docs/deployments/environments

**Scope note:** এই blueprint user-provided Master Prompt-এর implementation plan। কোনো code build, deployment বা test এই document তৈরির মাধ্যমে সম্পন্ন হয়েছে বলে দাবি করা হচ্ছে না।
