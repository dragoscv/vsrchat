# Changelog — vsrchat relay

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Messages and key-exchange now route **only across roles** (extension ↔ phone),
  never phone↔phone or ext↔ext — prevents undecryptable cross-phone traffic and
  connection-state corruption with multiple phones. Peer notifications are
  likewise cross-role only.

### Added

- **Multiple phones per pairing.** The relay now assigns each connection a stable
    peer id, supports many `pwa` peers in one room (only the extension is single),
    and routes key-exchange/envelopes per peer (with optional targeting).

### Added

- **Pairing-proof auth**: the extension claims a room with its GitHub identity +
    a pairing proof; a phone that scanned the QR joins with just the proof — no
    separate GitHub login on the phone. Eliminates account-mismatch errors.

### Fixed

- A new socket for a given role (ext/pwa) now **evicts the stale one** in the
    same room, preventing phantom "room-full" and stale-peer states caused by
    reconnects or re-pairing leaving ghost sockets.

### Changed

- Upgraded to latest stable dependencies: Hono 4.12, `@hono/node-server` 2,
  TypeScript 6, vitest 4.

### Added

- Forwarding of plaintext `kx` key-exchange frames so peers can complete ECDH.
- End-to-end-encrypted WebSocket broker (Hono + ws).
- GitHub token verification with a single-user allowlist.
- Room registry with per-room peer limits and liveness heartbeats.
- `/health` endpoint (avoids Google's reserved `/healthz`).
- Dockerfile + Cloud Build config; deployed to Cloud Run (scale-to-zero).
