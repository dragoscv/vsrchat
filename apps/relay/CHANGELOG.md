# Changelog — vsrchat relay

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- End-to-end-encrypted WebSocket broker (Hono + ws).
- GitHub token verification with a single-user allowlist.
- Room registry with per-room peer limits and liveness heartbeats.
- `/health` endpoint (avoids Google's reserved `/healthz`).
- Dockerfile + Cloud Build config; deployed to Cloud Run (scale-to-zero).
