# Architecture Decisions

- Next.js 15 maintenance LTS with middleware (no migration to Next 16 in this package).
- Supabase PostgreSQL + Auth + RLS; every command verifies an authenticated workspace context.
- Task approval in a SECURITY DEFINER SQL RPC because UI/button-only policies are insufficient.
- Each workspace-owned structured row carries a tenant ID; migration 002 adds composite FKs.
- No plaintext passwords. Directory stores vault links and non-secret account metadata.
- Credential-free repository. Production storage buckets default private.
- Rate limiting is currently in-memory and inadequate for scaled production.
- PDF generated with `pdf-lib` for serverless compatibility, but Unicode display needs a font plan.
- Automatic SEO data collection, automatic social posting and subscription billing were originally out of scope.
- Manual invitations until a verified transactional mail provider is connected.
