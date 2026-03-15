# @forsety/ui

## 1.0.0

### Major Changes

- 6f179c7: v1.0.0 — Production Ready Release

  All development phases completed:

  - Phase 1: Core Evidence (Forsety Verify) — dataset upload, license metadata, access verification, Evidence Pack export
  - Phase 2: Dashboard + RecallVault — 10 dashboard pages, 18 API routes, MCP server (7 tools), agent audit trail
  - Phase 3: Landing + UI/UX — Living Justice design system, dark/light mode, motion components
  - Phase 4: Agent Memory — MCP server, RecallVault, agent registration, key rotation

  Production hardening:

  - 381 tests passing (SDK: 207, Web: 109, MCP: 34, Auth: 31)
  - Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
  - Rate limiting (4-tier middleware)
  - Sentry error tracking (server/edge/client)
  - CI/CD: lint, typecheck, test, build, CodeQL, Dependabot, Changesets release
  - Tenant isolation (resolveAccessor + ownerAddress guard)
  - Aptos SIWA authentication + JWT sessions
