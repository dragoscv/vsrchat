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

## Releasing

1. Bump `apps/extension/package.json` version and update its `CHANGELOG.md`
   (the pre-commit gate enforces this).
2. Tag and push:

   ```bash
   git tag ext-v0.1.0
   git push origin ext-v0.1.0
   ```

3. `release-extension.yml` builds, packages the `.vsix`, and publishes to both
   marketplaces, then creates a GitHub Release with the VSIX attached.

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
