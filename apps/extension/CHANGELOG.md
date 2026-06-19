# Changelog — VS Remote Chat (extension)

All notable changes to the extension are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- E2E key agreement: the extension now exchanges public keys with the phone via
  a `kx` frame (sent after the relay accepts the join) and derives the shared
  AES-GCM key, instead of using a placeholder key.

### Added

- Initial extension: GitHub auth, phone pairing (QR + short code), end-to-end
  encrypted relay client, real Copilot session mirroring (read-only), managed
  chat via the Language Model API with streaming, experimental real-panel
  injection, and full settings.
