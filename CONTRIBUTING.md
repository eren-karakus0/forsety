# Contributing to Forsety

## Branch Naming

- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation
- `chore/description` — Maintenance tasks

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(sdk): add evidence pack verification
fix(web): resolve dashboard loading state
docs(readme): update getting started guide
chore(deps): update dependencies
```

## Changeset Workflow

We use [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

When your PR includes user-facing changes:

```bash
# 1. Create a changeset describing your change
pnpm changeset

# 2. Follow the prompts to select affected packages and bump type (patch/minor/major)

# 3. Commit the generated .changeset/*.md file with your PR
git add .changeset/
git commit -m "chore: add changeset"
```

Changesets are consumed during release — `pnpm version` applies them and bumps package versions.

## Development Workflow

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `pnpm lint && pnpm typecheck && pnpm test`
5. Create a changeset if applicable
6. Submit a pull request

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests |
| `pnpm changeset` | Create a changeset |

## Pull Request Process

1. Ensure CI passes
2. Update documentation if needed
3. Include a changeset for user-facing changes
4. Request review from @Forsetyxyz
