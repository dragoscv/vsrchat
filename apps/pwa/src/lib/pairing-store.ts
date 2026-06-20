'use client';

import { generateKeyPair, roomFromSecret, type KeyPair } from '@vsrchat/crypto';
import { CompactPairingSchema, PairingPayloadSchema } from '@vsrchat/protocol';

/** The relay the PWA uses unless a pairing overrides it. */
const DEFAULT_RELAY =
  process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://vsrchat-relay-246756727226.europe-west1.run.app/ws';

const KEY = 'vsrchat.pairing.v1';

export interface PwaPairing {
  /** Our (PWA) keypair. */
  keyPair: KeyPair;
  /** The extension's public key from the pairing payload. */
  extPublicKey: string;
  salt: string;
  room: string;
  relay: string;
  login?: string;
  pairedAt: number;
}

/** A normalized pairing parsed from a QR/deep-link (compact or legacy full). */
export interface ParsedPairing {
  extPublicKey: string;
  secret: string;
  room: string;
  relay: string;
  login?: string;
}

/** Decode a pairing from the URL hash. Supports the compact and legacy forms. */
export function decodePairingHash(hash: string): ParsedPairing | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }

  // Compact form: { k, s, r? }
  const compact = CompactPairingSchema.safeParse(json);
  if (compact.success) {
    return {
      extPublicKey: compact.data.k,
      secret: compact.data.s,
      room: roomFromSecret(compact.data.s),
      relay: compact.data.r ?? DEFAULT_RELAY,
    };
  }

  // Legacy full form: { v, relay, room, pub, secret, login?, exp }
  const full = PairingPayloadSchema.safeParse(json);
  if (full.success) {
    if (typeof full.data.exp === 'number' && full.data.exp < Date.now()) return null;
    return {
      extPublicKey: full.data.pub,
      secret: full.data.secret,
      room: full.data.room,
      relay: String(full.data.relay),
      login: full.data.login,
    };
  }
  return null;
}

/** Persist pairing locally (the private key never leaves the device). */
export function savePairing(p: PwaPairing): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function loadPairing(): PwaPairing | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PwaPairing;
  } catch {
    return null;
  }
}

export function clearPairing(): void {
  localStorage.removeItem(KEY);
}

/** Create the PWA pairing record from a parsed (compact or legacy) payload. */
export function createPairingFromPayload(payload: ParsedPairing): PwaPairing {
  const keyPair = generateKeyPair();
  return {
    keyPair,
    extPublicKey: payload.extPublicKey,
    salt: payload.secret,
    room: payload.room,
    relay: payload.relay,
    login: payload.login,
    pairedAt: Date.now(),
  };
}
