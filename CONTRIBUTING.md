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

## Development Workflow

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `pnpm lint && pnpm typecheck && pnpm test`
5. Submit a pull request

## Pull Request Process

1. Ensure CI passes
2. Update documentation if needed
3. Request review from @eren-karakus0
