# Test Results — 2026-10-27

| Test | Result | Evidence |
|---|---|---|
| TS/TSX source syntax | PASSED | `npm run verify:syntax`, 60 TS/TSX files parsed, zero syntax diagnostics |
| Internal import resolution | PASSED | `node scripts/source-audit.cjs`, 77 local imports located |
| UI action routing | PASSED | 30 form actions scanned; matched internal actions against 33 API switch cases |
| Standalone CSV parsing assertions | PASSED | 5 tests covering quotes, CRLF, duplicate headers and malformed input |
| SQL migration count/sequence | Source files present | 001, 002, 003 included; SQL not executed |
| npm dependency install | BLOCKED | DNS failed to resolve registry.npmjs.org; offline mode produced ENOTCACHED |
| Package lock generation | BLOCKED | npm cache incomplete; real lockfile cannot be truthfully generated offline |
| TypeScript typecheck | NOT RUN | Dependencies not installed |
| ESLint | NOT RUN | Dependencies not installed |
| Vitest unit tests | NOT RUN | Dependencies not installed |
| Next production build | NOT RUN | Dependencies not installed |
| Supabase SQL apply / RLS | NOT RUN | No connected test Supabase project |
| E2E / Playwright / Auth | NOT RUN | No runnable browser app or real test accounts |
| Vercel runtime / PDF / uploads | NOT RUN | No deployment configured |

Passing a syntax/static audit is **not** equivalent to passing a TypeScript typecheck, successful database migrations, functional tests or production security testing. Re-run everything after installing dependencies.
