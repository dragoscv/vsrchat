'use client';

import {
  PROTOCOL_VERSION,
  SealedEnvelopeSchema,
  type AppMessage,
  type SealedEnvelope,
} from '@vsrchat/protocol';
import { open, seal } from '@vsrchat/crypto';

export interface BrowserRelayOptions {
  relayUrl: string;
  room: string;
  authToken: string;
  key: CryptoKey;
  /** Our X25519 public key, broadcast to the extension for ECDH. */
  ourPublicKey: string;
  onMessage: (msg: AppMessage) => void;
  onStatus: (status: RelayStatus) => void;
  /** Surface a relay-level error (code + human message) to the UI. */
  onError?: (code: string, message: string) => void;
}

export type RelayStatus = 'connecting' | 'online' | 'peer-online' | 'peer-offline' | 'closed' | 'error';

/** Relay error codes that are permanent — reconnecting won't help. */
const FATAL_CODES = new Set(['unauthorized', 'room-full', 'bad-frame', 'protocol-mismatch']);

/**
 * Browser-side relay transport for the PWA. Encrypts every message before send,
 * decrypts every incoming envelope. The relay only ever sees ciphertext.
 * Auto-reconnects with exponential backoff.
 */
export class BrowserRelayClient {
  private ws?: WebSocket;
  private seq = 0;
  private backoff = 1000;
  private stopped = false;
  private fatal = false;

  constructor(private readonly opts: BrowserRelayOptions) {}

  connect(): void {
    this.stopped = false;
    this.fatal = false;
    this.opts.onStatus('connecting');
    const ws = new WebSocket(this.opts.relayUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = 1000;
      ws.send(
        JSON.stringify({
          t: 'join',
          room: this.opts.room,
          role: 'pwa',
          auth: this.opts.authToken,
          protocol: PROTOCOL_VERSION,
        }),
      );
    };

    ws.onmessage = (ev) => void this.handle(typeof ev.data === 'string' ? ev.data : '');

    ws.onclose = () => {
      this.opts.onStatus('closed');
      if (!this.stopped && !this.fatal) this.scheduleReconnect();
    };

    ws.onerror = () => this.opts.onStatus('error');
  }

  private scheduleReconnect(): void {
    const delay = Math.min(this.backoff, 15000);
    this.backoff *= 2;
    setTimeout(() => {
      if (!this.stopped) this.connect();
    }, delay);
  }

  private async handle(raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const obj = parsed as { t?: string; online?: boolean };
    if (obj.t === 'joined') {
      this.backoff = 1000;
      // Only safe to send frames after the (async) join is accepted.
      this.sendKeyExchange();
      return this.opts.onStatus('online');
    }
    if (obj.t === 'peer') {
      // When the extension (re)connects, re-announce our public key.
      if (obj.online) this.sendKeyExchange();
      return this.opts.onStatus(obj.online ? 'peer-online' : 'peer-offline');
    }
    if (obj.t === 'error') {
      const e = parsed as { code?: string; message?: string };
      const code = e.code ?? 'error';
      if (FATAL_CODES.has(code)) this.fatal = true; // stop the reconnect loop
      this.opts.onError?.(code, e.message ?? 'Relay error');
      return this.opts.onStatus('error');
    }
    if (obj.t === 'pong') return;
    if (obj.t === 'kx') return; // extension's public key; PWA already has it from the QR.

    const env = SealedEnvelopeSchema.safeParse(parsed);
    if (env.success) {
      try {
        const plaintext = await open(this.opts.key, {
          nonce: env.data.nonce,
          ciphertext: env.data.ciphertext,
        });
        this.opts.onMessage(JSON.parse(plaintext) as AppMessage);
      } catch {
        this.opts.onStatus('error');
      }
    }
  }

  private sendKeyExchange(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        t: 'kx',
        room: this.opts.room,
        from: 'pwa',
        pub: this.opts.ourPublicKey,
      }),
    );
  }

  async send(msg: AppMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const sealed = await seal(this.opts.key, JSON.stringify(msg));
    const env: SealedEnvelope = {
      t: 'sealed',
      room: this.opts.room,
      from: 'pwa',
      nonce: sealed.nonce,
      ciphertext: sealed.ciphertext,
      seq: this.seq++,
    };
    this.ws.send(JSON.stringify(env));
  }

  close(): void {
    this.stopped = true;
    this.ws?.close(1000, 'client-close');
    this.ws = undefined;
  }
}
