# Forsety

**Evidence layer for licensed AI data access** — Built on [Shelby Protocol](https://shelby.xyz)

> We prove licensed access and compliant usage.

## What is Forsety?

Forsety creates verifiable evidence packs that prove AI systems access datasets under valid licenses and comply with usage policies. Every data access is cryptographically committed to Shelby Protocol, creating an immutable audit trail.

## Architecture

```
forsety/
├── apps/web          # Next.js 15 dashboard + API
├── packages/sdk      # Core SDK — 8 services + Shelby wrapper
├── packages/db       # Drizzle ORM + Neon PostgreSQL (8 tables)
├── packages/mcp      # MCP server (stdio) — 6 tools, 3 middleware
├── packages/ui       # Shared UI components
└── tooling/scripts   # check-shelby, seed-demo
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Shelby CLI (`npm i -g @shelby-protocol/cli`)

### Setup

```bash
git clone https://github.com/eren-karakus0/forsety.git
cd forsety
pnpm install
pnpm dev
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests |
| `pnpm check:shelby` | Shelby CLI health check (stale lock detection, blob validation) |

## Tech Stack

- **Framework:** Next.js 15, React 19
- **Language:** TypeScript 5.7
- **Styling:** Tailwind CSS + Living Justice design system
- **Monorepo:** Turborepo + pnpm workspaces
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Storage:** Shelby Protocol (devnet)
- **Testing:** Vitest (114 tests)

## License

MIT
