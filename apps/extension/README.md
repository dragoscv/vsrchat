# VS Remote Chat (vsrchat)

**Drive your VS Code Copilot Chat from your phone.** View your sessions, watch
responses stream live, send new prompts, and approve tool/terminal calls — all
remotely, over an **end-to-end-encrypted** relay. The relay never sees your
messages in plaintext.

## Features

- 🔗 **Pair your phone** with a QR code (or short code).
- 📜 **Mirror** your real Copilot Chat sessions (read-only).
- ⚡ **Stream** model responses live to your phone.
- ✍️ **Send prompts** via the Language Model API (reliable) or, experimentally,
  into the real Copilot panel.
- ✅ **Approve/deny** tool & terminal calls remotely.
- 🔔 **Push notifications** when a response finishes or input is needed.
- 🔐 **End-to-end encrypted**, single-user, stateless relay.

## Getting started

1. Install the extension.
2. Run **VS Remote Chat: Pair a phone…** from the Command Palette.
3. Sign in with GitHub when prompted.
4. Scan the QR code with the [VS Remote Chat PWA](https://vsrchat.dragoscatalin.ro) on your phone.
5. Start chatting from anywhere.

## Settings

| Setting | Default | Description |
|---|---|---|
| `vsrchat.relayUrl` | `wss://relay.vsrchat.app/ws` | Your relay WebSocket URL. |
| `vsrchat.autoConnect` | `true` | Connect automatically when paired. |
| `vsrchat.sendMode` | `managed` | `managed` (Language Model API) or `realPanel` (experimental). |
| `vsrchat.mirrorRealSessions` | `true` | Mirror real Copilot sessions read-only. |
| `vsrchat.allowRemoteToolApproval` | `true` | Allow approving tools from the phone. |
| `vsrchat.allowRemoteAutoApprove` | `false` | Allow toggling per-session auto-approve. |
| `vsrchat.keepAwakeWhilePaired` | `false` | Keep the machine awake while paired. |
| `vsrchat.notifyOnResponse` | `true` | Push when a response finishes. |

## Privacy & security

vsrchat is single-user and locked to your GitHub account. All messages are
encrypted on your PC and only decrypted on your paired phone (and vice versa).
The Cloud Run relay only forwards opaque ciphertext and stores nothing.

See the [security docs](https://github.com/dragoscv/vsrchat/blob/main/docs/security.md).

## License

MIT © [Dragoș Cătălin](https://dragoscatalin.ro)
