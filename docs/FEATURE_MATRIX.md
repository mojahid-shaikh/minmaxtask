# Feature Coverage Matrix

Legend: **Source** = code supplied (requires live verification). **Partial** = some required behavior not implemented. **Missing** = not implemented. No module is labeled production-verified.

| Module | Source coverage | Remaining work |
|---|---|---|
| Public website/auth | Source | Real SMTP, OAuth, recovery and MFA challenge/login testing; account deletion |
| Profile and preferences | Partial | Avatar/cover uploads, complete preferences, account deletion |
| Workspaces/roles | Source | E2E multi-tenant access audit; granular permission UI |
| Invitations | Partial | Manual secure invite link; add transactional email integration |
| Projects & private membership | Source | Shared project permissions and project deletion UX testing |
| Tasks, evidence, approvals | Source | Real time-entry ledger, granular policy tests, E2E workflow |
| Custom sections/fields/records | Partial | Saved views, Kanban/Gallery, formulas, bulk exports and full import |
| SEO work log | Source | SEO templates/checklists; automated data collection deliberately out of scope |
| Keywords | Source | Bulk CSV/XLSX preview and import; export is CSV only, XLSX export missing |
| Topical maps | Source | Keyword linking, graph persistence need integration testing |
| Social content and calendar | Partial | Calendar month only; automated posting out of scope |
| Account directory | Source | Link and metadata only; enforce secure external vault workflow |
| Notifications/activity/search | Partial | In-app notifications only; no durable event delivery, no advanced index |
| Dashboard/analytics | Partial | Read-only summary and chart, not fully customizable widgets |
| PDF reporting | Source | Stored monthly reports; runtime and Unicode rendering QA needed |
| Storage/files | Source | Multipart upload/download; real Storage policy tests required |
| Quality and deployment | Partial | Syntax/import audit only; npm, build, SQL, integration and E2E remain unverified |
| Payments/subscriptions | Not in original release scope | Deliberately excluded |
