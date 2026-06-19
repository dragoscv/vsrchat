# Publishing the extension

vsrchat publishes to both the **VS Code Marketplace** and **Open VSX**.

## One-time setup

### VS Code Marketplace

1. Create a publisher at <https://marketplace.visualstudio.com/manage>.
   The publisher id must be **`dragoscv`** (matches `package.json`).
2. Create an Azure DevOps **Personal Access Token** with **Marketplace → Manage**
   scope: <https://dev.azure.com> → User settings → Personal access tokens.
3. Store it as the repo secret `VSCE_KEY` (the workflow maps it to the `VSCE_PAT`
   env var that `vsce` expects). This matches the secret name used across the
   `dragoscv` publisher's other extension repos.

### Open VSX

1. Create an account at <https://open-vsx.org> and a namespace `dragoscv`.
2. Generate an access token; store it as the repo secret `OVSX_KEY` (mapped to
   the `OVSX_PAT` env var at publish time).

## Releasing (automatic)

Publishing is **fully automatic and version-driven**. To cut a release you only
bump the version:

1. Bump `apps/extension/package.json` `version` and add a `CHANGELOG.md` entry
    (the pre-commit gate enforces this).
2. Commit and push to `main`.

That's it. The `release-extension.yml` workflow then:

- **Only runs** when files under `apps/extension/`, `packages/protocol/`, or
   `packages/crypto/` change (path-filtered) — unrelated pushes don't trigger it.
- A **gate job** checks whether a `ext-v<version>` tag already exists. If the
   version is unchanged, it **skips** (no publish, no wasted minutes). If the
   version is new, it proceeds.
- Builds, packages the `.vsix`, and publishes to the **VS Marketplace** and
   **Open VSX** (each step skips itself if that registry already has the version).
- **Creates and pushes the `ext-v<version>` git tag** and a **GitHub Release**
   with the VSIX attached — only after the marketplaces accept the version.

### Forcing a release

Run the workflow manually from the Actions tab (**Run workflow → force: true**)
to re-publish even when the version is unchanged.

## Manual publish (fallback)

```bash
pnpm --filter vsrchat build
cd apps/extension
pnpm package                 # -> vsrchat.vsix
VSCE_PAT=xxx pnpm publish:vsce   # value of the VSCE_KEY secret
OVSX_PAT=xxx pnpm publish:ovsx   # value of the OVSX_KEY secret
```

## Marketplace assets checklist

- [x] `icon` (128×128+) referenced in `package.json`
- [x] `README.md` (shown on the listing)
- [x] `CHANGELOG.md`
- [x] `LICENSE`
- [x] `categories`, `keywords`, `galleryBanner`
- [x] `repository`, `bugs`, `homepage`
