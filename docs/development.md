# Development

## Prerequisites

- Node 22+, pnpm 10+
- VS Code (to run the extension)
- (optional) gcloud + Terraform for infra

## Install

```bash
pnpm install
```

## Common scripts (root)

| Command | What |
|---|---|
| `pnpm dev` | Run all apps in watch mode (Turbo). |
| `pnpm build` | Build everything. |
| `pnpm test` | Run all unit tests. |
| `pnpm typecheck` | Typecheck all packages. |
| `pnpm lint` | Lint all packages. |
| `pnpm format` | Prettier write. |

## Per-app

```bash
pnpm --filter @vsrchat/relay dev      # relay on :8080
pnpm --filter @vsrchat/pwa dev        # PWA on :3030
pnpm --filter vsrchat dev             # extension bundle watch
```

### Run the extension in VS Code

Open the repo in VS Code and press **F5** (an `extensionHost` launch). Or build
and install the VSIX: `pnpm --filter vsrchat package`.

## Local end-to-end loop

1. `pnpm --filter @vsrchat/relay dev` (relay on `ws://localhost:8080/ws`).
2. Set `vsrchat.relayUrl` to `ws://localhost:8080/ws`.
3. `pnpm --filter @vsrchat/pwa dev` and set `NEXT_PUBLIC_RELAY_URL` likewise.
4. Pair using the QR/deep link.

> For a single-user local relay, leave `VSRCHAT_ALLOWED_GITHUB_*` empty to skip
> the allowlist (do **not** do this in production).

## Conventions

- Conventional Commits (`feat:`, `fix:`, …).
- Every shipping change bumps the app version + adds a `CHANGELOG.md` entry
  (enforced by `scripts/check-release.mjs` in pre-commit and CI).
- TypeScript strict everywhere; Zod at every boundary.
