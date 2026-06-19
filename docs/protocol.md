# Protocol reference

All schemas live in `packages/protocol` (Zod). Two layers:

## 1. Wire frames (relay sees these)

- **Relay control** (plaintext, the relay understands):
  `join`, `joined`, `peer`, `ping`, `pong`, `error`.
- **Sealed envelope** (opaque to the relay):

  ```ts
  { t: 'sealed', room, from: 'ext' | 'pwa', nonce, ciphertext, seq }
  ```

## 2. Application messages (E2E plaintext)

### PWA → Extension

| `k` | Purpose |
|---|---|
| `hello` | Handshake. |
| `sessions.list` | Request the session list. |
| `session.get` | Fetch one session's messages. |
| `chat.new` | Start a managed chat. |
| `prompt.send` | Send a prompt (`realPanel?` to inject into Copilot). |
| `prompt.cancel` | Cancel a running prompt. |
| `models.list` / `agent.list` | Enumerate models / agent modes. |
| `tool.approve` / `tool.deny` | Resolve a pending tool call. |
| `autoapprove.set` | Toggle per-session auto-approve. |
| `terminal.list` / `terminal.stop` / `task.stop` | Terminal & task control. |
| `voice.transcript` | Send a voice transcription as a prompt. |

### Extension → PWA

| `k` | Purpose |
|---|---|
| `hello` | Machine + version info. |
| `sessions.snapshot` | Full session list. |
| `session.snapshot` | One session in full. |
| `session.delta` | Streaming response fragment. |
| `models.snapshot` / `agents.snapshot` | Capability lists. |
| `tool.request` / `tool.resolved` | Tool/terminal approval lifecycle. |
| `terminal.snapshot` / `terminal.output` | Terminal state & output. |
| `notify` | Triggers a (content-free) push. |
| `error` | Something went wrong. |

See the source for exact field types — they are the single source of truth.
