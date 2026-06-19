# Contributing to vsrchat

Thanks for your interest! 🛰️

## Workflow

1. Fork & branch from `main`: `feat/short-description` or `fix/...`.
2. `pnpm install`, make your change, add tests.
3. Bump the affected app version + add a `CHANGELOG.md` entry (the pre-commit
   gate enforces this for shipping changes).
4. Ensure `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
5. Open a PR (Conventional Commit title). Keep PRs small and focused.

## Project layout

See [`docs/architecture.md`](docs/architecture.md) and
[`docs/development.md`](docs/development.md).

## Code standards

- TypeScript strict; validate boundaries with Zod.
- No secrets in code or git history.
- Match existing style; Prettier is enforced.

## Security

Found a vulnerability? Please **do not** open a public issue. Email the
maintainer via <https://dragoscatalin.ro>.
