# Security & encryption

vsrchat is designed so that **the relay can never read your messages**.

## Identity & access

- The extension and the PWA both authenticate with **GitHub**.
- The relay enforces a **single-user allowlist** (your GitHub id/login).
- Even if someone bypassed the allowlist, they still couldn't decrypt anything
  without the E2E key — defense in depth.

## Pairing & key agreement

1. The extension generates an **X25519 keypair** and a random pairing salt.
2. It shows a **QR code** (and a short pairing code) encoding: the relay URL,
   the room id, the extension's public key, and the salt.
3. The PWA scans it, generates its own X25519 keypair, and performs **ECDH**
   with the extension's public key.
4. Both sides run **HKDF-SHA256** over the shared secret + salt to derive the
   same **AES-256-GCM** key.

```mermaid
sequenceDiagram
  participant E as Extension (PC)
  participant R as Relay
  participant P as PWA (phone)
  E->>E: generate X25519 keypair + salt
  E-->>P: QR { relay, room, pubE, salt }
  P->>P: generate X25519 keypair
  P->>P: shared = ECDH(privP, pubE); key = HKDF(shared, salt)
  E->>E: shared = ECDH(privE, pubP); key = HKDF(shared, salt)
  Note over E,P: identical AES-256-GCM key — relay never learns it
```

## Message encryption

Every application message is serialized to JSON, then sealed with AES-256-GCM
(random 12-byte nonce per message). The relay only sees:

```json
{ "t": "sealed", "room": "room-…", "from": "pwa", "nonce": "…", "ciphertext": "…", "seq": 3 }
```

## What is *not* end-to-end encrypted

- **Web push notifications**: the push service (Apple/Google/Mozilla) can see the
  payload, so the extension only sends **content-free** alerts ("a response
  finished"). No message text is ever pushed.

## Local storage

- Private keys live in VS Code **SecretStorage** (extension) and the browser
  (PWA). The offline session cache in IndexedDB is itself **encrypted** with the
  shared key.

## Threat model summary

| Threat | Mitigation |
|---|---|
| Relay compromise | Sees only ciphertext; stores nothing. |
| Stolen GitHub token | Still needs the E2E key to read anything. |
| MITM on the wire | TLS (WSS) + AES-GCM auth tags. |
| Replay | Per-sender monotonic `seq`. |
| Lost phone | Unpair from Account; keys are device-local. |
