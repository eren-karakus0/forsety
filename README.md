<p align="center">
  <a href="https://forsety.xyz">
    <img src="https://forsety.xyz/opengraph-image" alt="Forsety — Evidence Layer for Licensed AI Data" width="800" />
  </a>
</p>

<h1 align="center">Forsety ᛏ</h1>

<p align="center">
  <strong>Evidence layer for licensed AI data access</strong><br/>
  Built on <a href="https://shelby.xyz">Shelby Protocol</a>
</p>

<p align="center">
  <a href="https://github.com/eren-karakus0/forsety/actions/workflows/ci.yml"><img src="https://github.com/eren-karakus0/forsety/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://shelby.xyz"><img src="https://img.shields.io/badge/Shelby-Protocol-D4AF37" alt="Shelby Protocol" /></a>
  <a href="https://forsety.xyz"><img src="https://img.shields.io/badge/Web-forsety.xyz-273C6B" alt="Website" /></a>
</p>

---

## The Problem

AI companies train on millions of datasets every day. But when a data provider asks **"Can you prove my data was used under a valid license?"** — there's silence.

There is no standard way to:
- Prove that a dataset was accessed under a valid license
- Track who accessed what, when, and how many times
- Generate audit-ready evidence for regulators and stakeholders

**The result?** Data providers lose trust, AI companies face compliance risk, and regulators have no visibility.

## The Solution

**Forsety** creates cryptographic **evidence packs** — tamper-proof bundles that prove every dataset interaction happened under a valid license and complied with usage policies.

Every access is recorded, every policy decision is enforced, and every proof is committed to [Shelby Protocol](https://shelby.xyz) for decentralized, immutable storage.

> Named after [Forseti](https://en.wikipedia.org/wiki/Forseti), the Norse god of justice — Forsety brings fairness and transparency to the AI data supply chain.

## Who Is This For?

| Audience | What Forsety Does |
|----------|-------------------|
| **Data Providers** | Prove your datasets are accessed only by licensed parties. Generate shareable evidence for auditors. |
| **AI Companies** | Demonstrate compliant data usage to regulators and partners. Reduce legal risk. |
| **Compliance Teams** | Audit every data access with cryptographic evidence packs. No more trust-based reporting. |
| **AI Agent Developers** | Give agents policy-aware data access via MCP server. Every agent action is logged and auditable. |

## How It Works

```
┌──────────────────────────────────────────────────────────────────────┐
│                        THREE-STEP PIPELINE                          │
│                                                                      │
│   1. UPLOAD & LICENSE    2. ACCESS & AUDIT    3. PROVE COMPLIANCE   │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│   │ Upload dataset   │   │ Every access is │   │ Generate an     │  │
│   │ to Shelby        │──▶│ logged with     │──▶│ evidence pack   │  │
│   │ Protocol         │   │ crypto proofs   │   │ and share it    │  │
│   │                  │   │                  │   │                  │  │
│   │ + Attach license │   │ + Policies are  │   │ + Licenses      │  │
│   │ + Define policy  │   │   enforced      │   │ + Access logs   │  │
│   │   (who, how many │   │ + Agents auth'd │   │ + Crypto proofs │  │
│   │    times, until  │   │ + Real-time     │   │ + Shelby commit │  │
│   │    when)         │   │   audit trail   │   │ + Shareable URL │  │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Step 1 — Upload & License:** Upload your dataset to Shelby Protocol. Attach an SPDX license (MIT, CC-BY-4.0, Apache-2.0, etc.) and define granular access policies: who can read, how many times, and until when.

**Step 2 — Access & Audit:** Every data access is authenticated, policy-checked, and cryptographically logged. AI agents connect via MCP, authenticate with API keys, and every operation is recorded in real time.

**Step 3 — Prove Compliance:** Generate an evidence pack — a verifiable bundle containing licenses, policies, access logs, and cryptographic proofs. Share it with auditors or stakeholders via a secure link.

## Core Features

### Verify — Cryptographic Evidence Packs
Generate tamper-proof bundles for every dataset interaction. Each pack contains SHA-256 hashes, HMAC signatures, timestamps, licenses, and access logs — all committed to Shelby Protocol.

### Recall — Persistent Agent Memory
Give AI agents persistent, namespace-scoped memory with automatic TTL expiration. Every memory operation is logged, creating a complete audit trail of agent behavior. Optional backup to decentralized storage.

### Shield — Policy Engine & Access Control
Define granular access policies per dataset. Control who can access data, how many times, and until when. Versioned policy history with atomic updates. Every policy decision is enforced and logged.

### MCP Server — AI Agent Integration
7 tools for AI agents via Model Context Protocol:
- `forsety_memory_store` / `retrieve` / `search` / `delete` — Agent memory management
- `forsety_dataset_access` — Policy-aware dataset access
- `forsety_policy_check` — Pre-access policy validation
- `forsety_semantic_search` — Vector-based content discovery

### Audit Trail
Every action across the system is logged with status breakdown (success / denied / error). Filter by agent, action type, date range. Export for compliance reporting.

### Aptos Wallet Auth (SIWA)
Sign In with Aptos — Ed25519 signature verification, JWT sessions, multi-network support (mainnet, testnet, devnet).

## Architecture

```
forsety/
├── apps/
│   └── web                   # Next.js 15 — Dashboard UI + 20+ API routes
│
├── packages/
│   ├── sdk                   # Core SDK — 11 services, Shelby wrapper
│   ├── db                    # Drizzle ORM + Neon PostgreSQL — 13 tables
│   ├── auth                  # SIWA (Sign In with Aptos) + JWT
│   ├── mcp                   # MCP server — 7 tools, 3 middleware
│   ├── ui                    # Shared UI components (shadcn/ui)
│   ├── config-typescript     # Shared TypeScript config
│   ├── config-eslint         # Shared ESLint config
│   └── config-tailwind       # Shared Tailwind config
│
└── tooling/
    └── scripts               # check-shelby, seed-demo
```

**SDK Services:** Dataset, License, Policy, Access, Evidence, Agent, AgentAudit, RecallVault, VectorSearch, Share, ShieldStore

**Database Tables:** datasets, licenses, policies, access_logs, evidence_packs, agents, agent_memories, agent_audit_logs, embeddings, sessions, users, encryption_metadata, shared_evidence_links

## Quick Start

### Prerequisites

- **Node.js** 22+
- **pnpm** 10+
- **PostgreSQL** — [Neon](https://neon.tech) recommended (free tier available)

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

### Your First Evidence Pack

1. **Connect wallet** — Click "Connect Wallet" and sign with your Aptos wallet
2. **Upload a dataset** — Go to Dashboard > Upload, drag a file, select a license
3. **Create a policy** — Define who can access, read limits, and expiration
4. **Generate evidence** — Click "Generate Evidence Pack" on any dataset
5. **Share** — Create a secure share link for auditors or stakeholders

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests (381 tests across 40 files) |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:migrate` | Run database migrations |
| `pnpm check:shelby` | Shelby CLI health check |
| `pnpm changeset` | Create a changeset for versioning |

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15, React 19 |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS 4 + Living Justice design system |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Database** | Neon PostgreSQL + Drizzle ORM |
| **Auth** | Sign In with Aptos (SIWA) + JWT |
| **Storage** | Shelby Protocol (decentralized) |
| **AI Agents** | Model Context Protocol (MCP) |
| **Testing** | Vitest — 381 tests, 40 files, 4 packages |
| **CI/CD** | GitHub Actions + CodeQL |
| **Versioning** | Changesets |

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/API.md) | All endpoints, auth model, migration guide |
| [Security Policy](SECURITY.md) | Vulnerability reporting and supported versions |
| [Contributing](CONTRIBUTING.md) | Development workflow, conventions, changeset guide |
| [Deferred Features](docs/DEFERRED.md) | Planned features for future phases |

## License

[MIT](LICENSE) — Created by [@eren-karakus0](https://github.com/eren-karakus0)
