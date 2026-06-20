import * as vscode from 'vscode';
import {
  deriveSharedKey,
  generateKeyPair,
  randomPairingCode,
  randomSecret,
  roomFromSecret,
  type KeyPair,
} from '@vsrchat/crypto';
import type { CompactPairing, PairingPayload } from '@vsrchat/protocol';

/** Default relay URL — kept in sync with the package.json setting default. */
export const DEFAULT_RELAY_URL = 'wss://vsrchat-relay-246756727226.europe-west1.run.app/ws';

const STORE_KEY = 'vsrchat.pairing';

export interface StoredPairing {
  keyPair: KeyPair;
  /** PWA's public key, learned during the handshake. */
  peerPublicKey?: string;
  salt: string;
  room: string;
  code: string;
  login?: string;
  createdAt: number;
}

/**
 * Manages the long-lived pairing state and the E2E key material.
 * Secrets are kept in VS Code SecretStorage (encrypted at rest by the OS keychain).
 */
export class PairingManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async load(): Promise<StoredPairing | undefined> {
    const raw = await this.context.secrets.get(STORE_KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as StoredPairing;
    } catch {
      return undefined;
    }
  }

  async save(p: StoredPairing): Promise<void> {
    await this.context.secrets.store(STORE_KEY, JSON.stringify(p));
  }

  async clear(): Promise<void> {
    await this.context.secrets.delete(STORE_KEY);
  }

  /** Create a fresh pairing (new keys, room, code) for a given GitHub identity. */
  async create(_githubId: string, login: string): Promise<StoredPairing> {
    const keyPair = generateKeyPair();
    const salt = randomSecret(32);
    // Room derives from the secret alone so the phone can compute the same id
    // from the QR without needing the GitHub user id (keeps the QR small).
    const room = roomFromSecret(salt);
    const code = randomPairingCode(8);
    const pairing: StoredPairing = {
      keyPair,
      salt,
      room,
      code,
      login,
      createdAt: Date.now(),
    };
    await this.save(pairing);
    return pairing;
  }

  /** Build the pairing payload (encoded into QR + recoverable from the code). */
  buildPayload(p: StoredPairing, relayHttpUrl: string): PairingPayload {
    return {
      v: 1,
      relay: relayHttpUrl,
      room: p.room,
      pub: p.keyPair.publicKey,
      secret: p.salt,
      login: p.login,
      exp: Date.now() + 10 * 60_000,
    };
  }

  /** Derive the shared symmetric key once we know the peer's public key. */
  async deriveKey(p: StoredPairing): Promise<CryptoKey> {
    if (!p.peerPublicKey) throw new Error('No peer public key yet.');
    return deriveSharedKey(p.keyPair.privateKey, p.peerPublicKey, p.salt);
  }

  /** Derive the shared key for a specific phone's public key. */
  async deriveKeyFor(p: StoredPairing, peerPublicKey: string): Promise<CryptoKey> {
    return deriveSharedKey(p.keyPair.privateKey, peerPublicKey, p.salt);
  }

  /** Compact payload for the QR (small + easy to scan). */
  buildCompactPayload(p: StoredPairing, relayHttpUrl: string): CompactPairing {
    const out: CompactPairing = { k: p.keyPair.publicKey, s: p.salt };
    // Only include the relay if it isn't the app's default (keeps QR small).
    if (relayHttpUrl && relayHttpUrl !== DEFAULT_RELAY_URL) out.r = relayHttpUrl;
    return out;
  }
}
