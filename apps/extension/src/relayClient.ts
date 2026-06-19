import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import {
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
  /** GitHub token for relay auth. */
  authToken: string;
  /** Shared AES-GCM key for E2E. */
  key: CryptoKey;
}

type Events = {
  connected: [];
  joined: [{ peers: number }];
  peer: [{ role: Peer; online: boolean }];
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

  constructor(private readonly opts: RelayClientOptions) {
    super();
  }

  connect(): void {
    this.closedByUs = false;
    const ws = new WebSocket(this.opts.relayUrl);
    this.ws = ws;

    ws.on('open', () => {
      this.emit('connected');
      ws.send(
        JSON.stringify({
          t: 'join',
          room: this.opts.room,
          role: this.opts.role,
          auth: this.opts.authToken,
          protocol: PROTOCOL_VERSION,
        }),
      );
    });

    ws.on('message', (raw) => {
      void this.handle(raw.toString());
    });

    ws.on('close', (code, reason) => {
      this.emit('closed', { code, reason: reason.toString() });
    });

    ws.on('error', (err) => {
      this.emit('error', { code: 'ws-error', message: String(err) });
    });
  }

  private async handle(raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const obj = parsed as { t?: string };
    if (obj.t === 'joined') return void this.emit('joined', { peers: (parsed as { peers: number }).peers });
    if (obj.t === 'peer') return void this.emit('peer', parsed as { role: Peer; online: boolean });
    if (obj.t === 'error') return void this.emit('error', parsed as { code: string; message: string });
    if (obj.t === 'pong') return;

    const env = SealedEnvelopeSchema.safeParse(parsed);
    if (env.success) {
      try {
        const plaintext = await open(this.opts.key, {
          nonce: env.data.nonce,
          ciphertext: env.data.ciphertext,
        });
        this.emit('message', JSON.parse(plaintext) as AppMessage);
      } catch {
        this.emit('error', { code: 'decrypt-failed', message: 'Could not decrypt an envelope.' });
      }
    }
  }

  /** Encrypt and send an application message to the peer(s). */
  async send(msg: AppMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const sealed: Sealed = await seal(this.opts.key, JSON.stringify(msg));
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

  close(): void {
    this.closedByUs = true;
    this.ws?.close(1000, 'client-close');
    this.ws = undefined;
  }

  wasClosedByUs(): boolean {
    return this.closedByUs;
  }
}
