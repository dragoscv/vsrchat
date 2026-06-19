import * as vscode from 'vscode';
import {
  deriveRoomId,
  deriveSharedKey,
  generateKeyPair,
  randomPairingCode,
  randomSecret,
  type KeyPair,
} from '@vsrchat/crypto';
import type { PairingPayload } from '@vsrchat/protocol';

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
  async create(githubId: string, login: string): Promise<StoredPairing> {
    const keyPair = generateKeyPair();
    const salt = randomSecret(32);
    const room = deriveRoomId(githubId, salt);
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
}
