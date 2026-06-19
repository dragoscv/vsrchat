# CI/CD overview

All pipelines are **smart and version-driven**: they only act when something
relevant changed, and releases are triggered by a version bump — not manual tags.

## Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PRs to `main` | Typecheck, lint, test, build (affected only) + release gate. |
| `release-extension.yml` | push to `main` (extension/protocol/crypto paths) | Gate on new version → publish to VS Marketplace + Open VSX → auto-tag `ext-v*` + GitHub Release. |
| `release-relay.yml` | push to `main` (relay/protocol/crypto paths) | Gate on GCP secrets + new version → build/push image → deploy Cloud Run → `/health` check → auto-tag `relay-v*`. |
| `verify-pwa.yml` | push to `main` (pwa/protocol/crypto paths) | Verifies the Vercel production deploy for the commit succeeded and the live site is healthy. |

The PWA itself is deployed by **Vercel's native Git integration** (Root
Directory `apps/pwa`); `verify-pwa.yml` only validates the result.

## Releasing anything

1. Bump the app's `version` in its `package.json`.
2. Add a `CHANGELOG.md` entry under `## [Unreleased]`.
3. Push to `main`.

The pre-commit **release gate** (`scripts/check-release.mjs`) enforces steps 1–2
with copy-pasteable guidance, so you can't forget. Dependency-only changes and
docs are exempt.

If the version is unchanged, the release workflows **skip cleanly** (the
`<app>-v<version>` git tag already exists). Use **Run workflow → force** to
re-publish/re-deploy an unchanged version.

## Authentication (no long-lived keys)

- **Relay → GCP**: keyless **Workload Identity Federation**. The
  `dragoscv/vsrchat` repo impersonates the `vsrchat-deployer` service account via
  GitHub OIDC. Secrets: `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`.
- **Extension → marketplaces**: `VSCE_KEY` (Azure DevOps PAT), `OVSX_KEY`.
- **PWA → Vercel**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- **Relay allowlist**: `VSRCHAT_ALLOWED_GITHUB_IDS`, `VSRCHAT_ALLOWED_GITHUB_LOGINS`.
