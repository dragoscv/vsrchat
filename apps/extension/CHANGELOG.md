# Changelog — VS Remote Chat (extension)

All notable changes to the extension are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Sessions now appear after pairing.** Fixed a key-handshake race where the
  phone's first requests arrived before the extension derived the shared key and
  were silently dropped. The extension now buffers early envelopes and flushes
  them once the key is ready.

### Added

- A **"Copy pairing link"** button on the QR panel (useful for debugging or
  pairing without a camera).

### Changed

- **Simpler QR code**: the pairing QR now encodes a compact payload (just the
  public key + secret; the room is derived from the secret) with low error
  correction and high contrast, so phone cameras scan it far more reliably.

### Added

- The extension now **claims the pairing room** with its GitHub identity so the
  phone can join just by scanning the QR (no phone sign-in needed).

### Added

- The pairing QR panel now updates live to a **"Phone connected!"** state once
  your phone completes the handshake, instead of showing the QR indefinitely.

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
