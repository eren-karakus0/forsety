# Forsety

**Evidence layer for licensed AI data access** — Built on [Shelby Protocol](https://shelby.xyz)

> We prove licensed access and compliant usage.

## What is Forsety?

Forsety creates verifiable evidence packs that prove AI systems access datasets under valid licenses and comply with usage policies. Every data access is cryptographically committed to Shelby Protocol, creating an immutable audit trail.

## Architecture

```
forsety/
├── apps/web          # Next.js 15 dashboard
├── packages/sdk      # Core SDK (@forsety/sdk)
├── packages/ui       # Shared UI components (@forsety/ui)
└── tooling/scripts   # Development utilities
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
| `pnpm check:shelby` | Shelby CLI connection check (stub — Phase 1) |

## Tech Stack

- **Framework:** Next.js 15, React 19
- **Language:** TypeScript 5.7
- **Styling:** Tailwind CSS + Living Justice design system
- **Monorepo:** Turborepo + pnpm workspaces
- **Storage:** Shelby Protocol (devnet)
- **Testing:** Vitest

## License

MIT
