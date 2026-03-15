# Forsety ᛏ

**Evidence layer for licensed AI data access** — Built on [Shelby Protocol](https://shelby.xyz)

[![CI](https://github.com/eren-karakus0/forsety/actions/workflows/ci.yml/badge.svg)](https://github.com/eren-karakus0/forsety/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Shelby Protocol](https://img.shields.io/badge/Shelby-Protocol-D4AF37)](https://shelby.xyz)

> We prove licensed access and compliant usage.

## What is Forsety?

Forsety creates verifiable **evidence packs** that prove AI systems access datasets under valid licenses and comply with usage policies. Every data interaction is cryptographically committed to [Shelby Protocol](https://shelby.xyz), creating an immutable audit trail.

Named after [Forseti](https://en.wikipedia.org/wiki/Forseti), the Norse god of justice, Forsety brings fairness and transparency to the AI data supply chain.

| Who | Why |
|-----|-----|
| **Data providers** | Prove your datasets are accessed only by licensed parties |
| **AI developers** | Demonstrate compliant data usage to regulators and partners |
| **Compliance teams** | Audit every access with cryptographic evidence |
| **AI agents (MCP)** | Automated policy-aware data access via MCP server |

## Key Features

- **Evidence Packs** — Cryptographic proof bundles for every dataset interaction (SHA-256 hash, HMAC, timestamps)
- **License Metadata** — SPDX-typed licenses with grantor tracking and revocation support
- **Policy Management** — Versioned access policies with accessor allowlists, read limits, and expiration
- **RecallVault** — Persistent agent memory with namespace isolation, TTL auto-expire, and Shelby backup
- **MCP Server** — 7 tools for AI agents: memory store/retrieve/search/delete, dataset access, policy check, semantic search
- **Audit Trail** — Every agent action logged with success/denied/error status breakdown
- **Semantic Search** — Vector embeddings for dataset and memory content discovery
- **Shelby Protocol** — Decentralized storage with blob commitments and on-chain verification
- **Aptos Wallet Auth** — Sign In with Aptos (SIWA) using Ed25519 signature verification

## Architecture

```
forsety/
├── apps/
│   └── web                 # Next.js 15 dashboard + API routes
├── packages/
│   ├── sdk                 # Core SDK — 11 services + Shelby wrapper
│   ├── db                  # Drizzle ORM + Neon PostgreSQL (13 tables)
│   ├── auth                # SIWA (Sign In with Aptos) + JWT
│   ├── mcp                 # MCP server — 7 tools, 3 middleware
│   ├── ui                  # Shared UI components (shadcn/ui)
│   ├── config-typescript   # Shared TypeScript config
│   ├── config-eslint       # Shared ESLint config
│   └── config-tailwind     # Shared Tailwind config
└── tooling/
    └── scripts             # check-shelby, seed-demo
```

## Quick Start

### Prerequisites

- **Node.js** 22+
- **pnpm** 10+
- **Shelby CLI** — `npm i -g @aspect-build/shelby-cli`
- **PostgreSQL** — [Neon](https://neon.tech) recommended

### Setup

```bash
# Clone
git clone https://github.com/eren-karakus0/forsety.git
cd forsety

# Install dependencies
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your database URL, JWT secret, etc.

# Push database schema
pnpm db:push

# Start development
pnpm dev
```

The dashboard will be available at `http://localhost:3000`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:migrate` | Run database migrations |
| `pnpm check:shelby` | Shelby CLI health check (stale lock detection, blob validation) |
| `pnpm changeset` | Create a changeset for versioning |
| `pnpm version` | Apply changesets and bump versions |

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15, React 19 |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS 4 + Living Justice design system |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Database** | Neon PostgreSQL + Drizzle ORM |
| **Auth** | Sign In with Aptos (SIWA) + JWT |
| **Storage** | Shelby Protocol |
| **AI Agents** | Model Context Protocol (MCP) |
| **Testing** | Vitest — 40 test files across 4 packages |
| **CI/CD** | GitHub Actions |
| **Versioning** | Changesets |

## Documentation

- [API Reference](docs/API.md) — All endpoints, auth model, migration guide
- [Security Policy](SECURITY.md) — Vulnerability reporting
- [Contributing](CONTRIBUTING.md) — Development workflow and conventions
- [Deferred Features](docs/DEFERRED.md) — Planned features for future phases

## License

[MIT](LICENSE) — Created by [@eren-karakus0](https://github.com/eren-karakus0)
