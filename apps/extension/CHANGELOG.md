# Changelog — VS Remote Chat (extension)

All notable changes to the extension are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Pairing/connection no longer gets stuck with
  "WebSocket was closed before the connection was established". A still-connecting
  socket that is superseded (auto-connect then re-pair) is now torn down safely
  and the benign error is suppressed. The extension relay client now also
  **auto-reconnects** with exponential backoff if the connection drops.

### Added

- Sessions are now tagged with their **workspace** (name, path, stable id, and
  whether it's the currently focused window), so chats from different VS Code
  windows are correctly differentiated.

### Fixed

- Pairing deep links now point at the correct PWA domain
  `https://vsrchat.dragoscatalin.ro`.

### Changed

- Upgraded to latest stable dependencies: TypeScript 6, `@noble/curves` 2 +
  `@noble/hashes` 2 (new import paths), `@vscode/vsce` 3.9, `ovsx` 1, vitest 4.

### Fixed

- E2E key agreement: the extension now exchanges public keys with the phone via
  a `kx` frame (sent after the relay accepts the join) and derives the shared
  AES-GCM key, instead of using a placeholder key.

### Added

- Initial extension: GitHub auth, phone pairing (QR + short code), end-to-end
  encrypted relay client, real Copilot session mirroring (read-only), managed
  chat via the Language Model API with streaming, experimental real-panel
  injection, and full settings.
