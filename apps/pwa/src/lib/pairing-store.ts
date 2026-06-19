'use client';

import { generateKeyPair, type KeyPair } from '@vsrchat/crypto';
import type { PairingPayload } from '@vsrchat/protocol';

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

/** Decode a pairing payload from the URL hash (base64url JSON). */
export function decodePairingHash(hash: string): PairingPayload | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  try {
    const json = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as PairingPayload;
  } catch {
    return null;
  }
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

/** Create the PWA pairing record from a scanned/entered payload. */
export function createPairingFromPayload(payload: PairingPayload): PwaPairing {
  const keyPair = generateKeyPair();
  return {
    keyPair,
    extPublicKey: payload.pub,
    salt: payload.secret,
    room: payload.room,
    relay: typeof payload.relay === 'string' ? payload.relay : String(payload.relay),
    login: payload.login,
    pairedAt: Date.now(),
  };
}
