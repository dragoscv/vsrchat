import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import {
  KeyExchangeFrameSchema,
  PROTOCOL_VERSION,
  SealedEnvelopeSchema,
  type AppMessage,
  type Peer,
  type SealedEnvelope,
} from '@vsrchat/protocol';
import { open, seal, type Sealed } from '@vsrchat/crypto';

export interface RelayClientOptions {
  relayUrl: string;
  room: string;
  role: Peer;
  /** GitHub token for relay auth (the claimer/extension). */
  authToken?: string;
  /** Pairing proof — registers/refreshes the room claim. */
  proof?: string;
  /** Shared AES-GCM key for E2E. May be undefined until key exchange completes. */
  key?: CryptoKey;
  /** Our X25519 public key, broadcast to the peer for ECDH. */
  ourPublicKey: string;
}

type Events = {
  connected: [];
  joined: [{ peers: number }];
  peer: [{ role: Peer; online: boolean }];
  keyExchange: [{ pub: string }];
  message: [AppMessage];
  error: [{ code: string; message: string }];
  closed: [{ code: number; reason: string }];
};

/**
 * Extension-side relay transport. Encrypts every AppMessage before sending and
 * decrypts incoming envelopes. The relay only ever sees ciphertext.
 */
export class RelayClient extends EventEmitter<Events> {
  private ws?: WebSocket;
  private seq = 0;
  private closedByUs = false;
  private key?: CryptoKey;
  private backoff = 1000;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  /** Envelopes received before the key was ready; flushed by setKey(). */
  private pending: SealedEnvelope[] = [];

  constructor(private readonly opts: RelayClientOptions) {
    super();
    this.key = opts.key;
  }

  /** Set/replace the shared key once key exchange completes. */
  setKey(key: CryptoKey): void {
    this.key = key;
    // Flush any envelopes that arrived before the key was derived.
    const queued = this.pending;
    this.pending = [];
    for (const env of queued) {
      void this.decryptAndEmit(env);
    }
  }

  hasKey(): boolean {
    return !!this.key;
  }

  connect(): void {
    this.closedByUs = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    // Tear down any previous socket without surfacing benign errors.
    this.teardownSocket();
    const ws = new WebSocket(this.opts.relayUrl);
    this.ws = ws;

    ws.on('open', () => {
      this.emit('connected');
      ws.send(
        JSON.stringify({
          t: 'join',
          room: this.opts.room,
          role: this.opts.role,
          ...(this.opts.authToken ? { auth: this.opts.authToken } : {}),
          ...(this.opts.proof ? { proof: this.opts.proof } : {}),
          protocol: PROTOCOL_VERSION,
        }),
      );
    });

    ws.on('message', (raw) => {
      void this.handle(raw.toString());
    });

    ws.on('close', (code, reason) => {
      if (ws !== this.ws) return; // stale socket
      this.emit('closed', { code, reason: reason.toString() });
      if (!this.closedByUs) this.scheduleReconnect();
    });

    ws.on('error', (err) => {
      if (ws !== this.ws) return; // stale socket, ignore
      const message = err instanceof Error ? err.message : String(err);
      // Benign: happens when a still-connecting socket is closed (e.g. a
      // reconnect or re-pair superseded it). Don't surface to the user.
      if (/closed before the connection is established/i.test(message)) return;
      this.emit('error', { code: 'ws-error', message });
    });
  }

  private scheduleReconnect(): void {
    if (this.closedByUs || this.reconnectTimer) return;
    const delay = Math.min(this.backoff, 15000);
    this.backoff *= 2;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.closedByUs) this.connect();
    }, delay);
  }

  /** Detach handlers and close/terminate the current socket safely. */
  private teardownSocket(): void {
    const ws = this.ws;
    if (!ws) return;
    this.ws = undefined;
    ws.removeAllListeners();
    // Swallow any late error from terminating a connecting socket.
    ws.on('error', () => {});
    try {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      } else {
        ws.close(1000, 'client-close');
      }
    } catch {
      /* ignore */
    }
  }

  private async handle(raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const obj = parsed as { t?: string };
    if (obj.t === 'joined') {
      this.backoff = 1000; // healthy connection — reset backoff
      // Only safe to send after the (async) join is accepted by the relay.
      this.sendKeyExchange();
      return void this.emit('joined', { peers: (parsed as { peers: number }).peers });
    }
    if (obj.t === 'peer') {
      this.emit('peer', parsed as { role: Peer; online: boolean });
      // Re-announce our key when a peer (re)connects.
      if ((parsed as { online?: boolean }).online) this.sendKeyExchange();
      return;
    }
    if (obj.t === 'error') return void this.emit('error', parsed as { code: string; message: string });
    if (obj.t === 'pong') return;

    const kx = KeyExchangeFrameSchema.safeParse(parsed);
    if (kx.success) {
      return void this.emit('keyExchange', { pub: kx.data.pub });
    }

    const env = SealedEnvelopeSchema.safeParse(parsed);
    if (env.success) {
      if (!this.key) {
        // Key not derived yet (kx still in flight). Buffer briefly so we don't
        // lose the peer's first requests; flushed by setKey().
        this.pending.push(env.data);
        return;
      }
      await this.decryptAndEmit(env.data);
    }
  }

  private async decryptAndEmit(env: SealedEnvelope): Promise<void> {
    if (!this.key) return;
    try {
      const plaintext = await open(this.key, { nonce: env.nonce, ciphertext: env.ciphertext });
      this.emit('message', JSON.parse(plaintext) as AppMessage);
    } catch {
      this.emit('error', { code: 'decrypt-failed', message: 'Could not decrypt an envelope.' });
    }
  }

  private sendKeyExchange(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        t: 'kx',
        room: this.opts.room,
        from: this.opts.role,
        pub: this.opts.ourPublicKey,
      }),
    );
  }

  /** Encrypt and send an application message to the peer(s). */
  async send(msg: AppMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.key) return;
    const sealed: Sealed = await seal(this.key, JSON.stringify(msg));
    const env: SealedEnvelope = {
      t: 'sealed',
      room: this.opts.room,
      from: this.opts.role,
      nonce: sealed.nonce,
      ciphertext: sealed.ciphertext,
      seq: this.seq++,
    };
    this.ws.send(JSON.stringify(env));
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  wasClosedByUs(): boolean {
    return this.closedByUs;
  }

  close(): void {
    this.closedByUs = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.teardownSocket();
  }
}
