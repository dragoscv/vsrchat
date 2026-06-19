<div align="center">

# 🛰️ vsrchat — VS Remote Chat

**Drive your VS Code Copilot Chat from your phone.**
A beautiful dark, glass-morphism PWA ⇄ an end-to-end-encrypted Cloud Run relay ⇄ a VS Code extension on your PC.

[![CI](https://github.com/dragoscv/vsrchat/actions/workflows/ci.yml/badge.svg)](https://github.com/dragoscv/vsrchat/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## What is this?

Your Copilot Chat runs on your home PC. `vsrchat` lets you **see your sessions, watch responses stream live, send new prompts, and approve tool/terminal calls** — all from your phone, through an installable PWA. Everything is **end-to-end encrypted**; the relay only ever sees ciphertext.

## Features

- 📜 View all Copilot Chat sessions and their messages (mirrored read-only).
- ⚡ Live-stream model responses as they generate.
- ✍️ Send new prompts / continue sessions (`vscode.lm` managed; optional real-panel inject).
- ✅ Approve / deny tool & terminal calls remotely; per-session auto-approve.
- 🆕 Start a new chat, pick agent mode & model.
- 🔔 Web-push notifications when a response finishes or input is needed.
- 🖥️ View / stop running terminal commands & tasks.
- 📎 Attach files / images, 🎙️ voice-to-prompt.
- 🔐 End-to-end encrypted, single-user, stateless relay.

## Architecture

```
📱 PWA (Vercel)  ⇄  ☁️ Relay (Cloud Run, ciphertext only)  ⇄  🖥️ Extension (VS Code)
```

**Live:** PWA → https://vsrchat.dragoscatalin.ro · Relay → `wss://vsrchat-relay-246756727226.europe-west1.run.app/ws`

See [`plan/PLAN.md`](plan/PLAN.md) and [`docs/`](docs/) for full details.

## Monorepo

| Path | What |
|---|---|
| `apps/extension` | VS Code extension |
| `apps/relay` | Hono + ws WebSocket broker (Cloud Run) |
| `apps/pwa` | Next.js 16 PWA (Vercel) |
| `packages/protocol` | Shared Zod wire schemas |
| `packages/crypto` | End-to-end encryption |
| `packages/config` | Shared tsconfig/eslint |
| `infra` | Terraform (GCP) |

## Quick start (dev)

```bash
pnpm install
pnpm dev          # runs all apps in watch mode
pnpm build        # build everything
pnpm test         # run tests
```

## Documentation

- [Setup guide](docs/setup.md)
- [How pairing & encryption work](docs/security.md)
- [Publishing the extension](docs/publishing.md)
- [Deploying the relay](docs/deploy-relay.md)

## License

MIT © [Dragoș Cătălin](https://dragoscatalin.ro)
