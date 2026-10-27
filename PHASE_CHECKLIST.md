# Phases from the original roadmap

Status categories: **Source authored** ≠ **Acceptance gate passed**.

| Phase | Source progress | Gate status |
|---|---|---|
| 0. Product requirements & UX architecture | Blueprint retained, sitemap and roles modeled | Needs acceptance |
| 1. Engineering foundation & UI | Next/React source, responsive shell, design system | Needs npm/build test |
| 2. Auth, DB and multi-tenancy | Auth source, migrations, RLS/RPC policy source | Needs live SQL and tenant denial tests |
| 3. Profiles, workspaces and invitations | Screens, roles, manual invitations and transfer RPC | Needs 3-user test |
| 4. Projects, dynamic sections and tasks | CRUD, sections, task approvals, evidence/checklists | Partial requirements; needs E2E |
| 5. SEO, keywords and topical maps | Logs, imports and React Flow source | Needs actual persistence tests |
| 6. Social, calendar, account directory, files | Data registry/calendar/buckets written | Partial; needs Storage and date tests |
| 7. Notifications, search and dashboards | Screens and server queries written | Partial; needs audits and optimization |
| 8. PDF reports | Generation and stored downloads authored | Needs real PDF, permissions and Vercel tests |
| 9. QA, hardening and deployment | Docs/test guides authored | NOT completed |
