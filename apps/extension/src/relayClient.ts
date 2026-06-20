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
  peer: [{ role: Peer; online: boolean; pid?: string }];
  keyExchange: [{ pub: string; pid?: string }];
  message: [AppMessage];
  error: [{ code: string; message: string }];
  closed: [{ code: number; reason: string }];
};

interface PeerState {
  key: CryptoKey;
  seq: number;
}

/**
 * Extension-side relay transport. Encrypts every AppMessage before sending and
 * decrypts incoming envelopes. The relay only ever sees ciphertext.
 */
export class RelayClient extends EventEmitter<Events> {
  private ws?: WebSocket;
  private seq = 0;
  private closedByUs = false;
  /** Per-phone key state, keyed by the relay-assigned peer id (pid). */
  private peers = new Map<string, PeerState>();
  /** Fallback single key (legacy peers that don't send a pid). */
  private key?: CryptoKey;
  private backoff = 1000;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  /** Envelopes received before a usable key was ready; flushed by setKey(). */
  private pending: SealedEnvelope[] = [];

  constructor(private readonly opts: RelayClientOptions) {
    super();
    this.key = opts.key;
  }

  /**
   * Register the derived key for a specific phone (by pid). Falls back to a
   * single shared key when no pid is provided (legacy single-phone path).
   */
  setKey(key: CryptoKey, pid?: string): void {
    if (pid) this.peers.set(pid, { key, seq: 0 });
    else this.key = key;
    // Flush any envelopes that arrived before a key was available.
    const queued = this.pending;
    this.pending = [];
    for (const env of queued) void this.decryptAndEmit(env);
  }

  hasKey(): boolean {
    return this.peers.size > 0 || !!this.key;
  }

  /** Forget a phone's key when it disconnects. */
  dropPeer(pid: string): void {
    this.peers.delete(pid);
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
      const p = parsed as { role: Peer; online: boolean; pid?: string };
      this.emit('peer', p);
      if (p.online) {
        // Re-announce our public key, targeted to the new peer if known.
        this.sendKeyExchange(p.pid);
      } else if (p.pid) {
        this.dropPeer(p.pid);
      }
      return;
    }
    if (obj.t === 'error') return void this.emit('error', parsed as { code: string; message: string });
    if (obj.t === 'pong') return;

    const kx = KeyExchangeFrameSchema.safeParse(parsed);
    if (kx.success) {
      return void this.emit('keyExchange', { pub: kx.data.pub, pid: kx.data.pid });
    }

    const env = SealedEnvelopeSchema.safeParse(parsed);
    if (env.success) {
      // Buffer until we have at least one key (kx may still be in flight).
      if (this.peers.size === 0 && !this.key) {
        this.pending.push(env.data);
        return;
      }
      await this.decryptAndEmit(env.data);
    }
  }

  private async decryptAndEmit(env: SealedEnvelope): Promise<void> {
    // Prefer the key for the sending peer; fall back to trying all known keys.
    const candidates: CryptoKey[] = [];
    if (env.pid && this.peers.has(env.pid)) candidates.push(this.peers.get(env.pid)!.key);
    for (const p of this.peers.values()) if (!candidates.includes(p.key)) candidates.push(p.key);
    if (this.key && !candidates.includes(this.key)) candidates.push(this.key);
    for (const key of candidates) {
      try {
        const plaintext = await open(key, { nonce: env.nonce, ciphertext: env.ciphertext });
        return void this.emit('message', JSON.parse(plaintext) as AppMessage);
      } catch {
        /* try next key */
      }
    }
    this.emit('error', { code: 'decrypt-failed', message: 'Could not decrypt an envelope.' });
  }

  private sendKeyExchange(to?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        t: 'kx',
        room: this.opts.room,
        from: this.opts.role,
        pub: this.opts.ourPublicKey,
        ...(to ? { to } : {}),
      }),
    );
  }

  /**
   * Encrypt and send an application message to every paired phone. Each phone
   * has its own key, so we seal once per peer and target the envelope by pid.
   * Optionally restrict to a single peer with `toPid`.
   */
  async send(msg: AppMessage, toPid?: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const plaintext = JSON.stringify(msg);

    if (this.peers.size > 0) {
      for (const [pid, st] of this.peers) {
        if (toPid && pid !== toPid) continue;
        const sealed: Sealed = await seal(st.key, plaintext);
        this.sendEnvelope(sealed, st.seq++, pid);
      }
      return;
    }
    // Legacy single-key fallback.
    if (this.key) {
      const sealed: Sealed = await seal(this.key, plaintext);
      this.sendEnvelope(sealed, this.seq++);
    }
  }

  private sendEnvelope(sealed: Sealed, seq: number, to?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const env: SealedEnvelope = {
      t: 'sealed',
      room: this.opts.room,
      from: this.opts.role,
      nonce: sealed.nonce,
      ciphertext: sealed.ciphertext,
      seq,
      ...(to ? { to } : {}),
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
