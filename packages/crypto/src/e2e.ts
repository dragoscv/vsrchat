import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base64urlToBytes, bytesToBase64url, bytesToUtf8, utf8ToBytes } from './base64.js';

/**
 * End-to-end encryption for vsrchat.
 *
 * Key agreement: X25519 ECDH between the extension and the PWA.
 * Key derivation: HKDF-SHA256 over the shared secret + pairing salt.
 * Encryption: AES-256-GCM (WebCrypto `subtle`, available in Node 22+ and browsers).
 *
 * The relay never has any key material and only forwards ciphertext.
 */

const subtle = (globalThis.crypto as Crypto).subtle;
const NONCE_BYTES = 12;
const HKDF_INFO = utf8ToBytes('vsrchat-e2e-v1');

export interface KeyPair {
  /** base64url X25519 public key. */
  publicKey: string;
  /** base64url X25519 private key. Never leaves the device that made it. */
  privateKey: string;
}

/** Generate an X25519 keypair. */
export function generateKeyPair(): KeyPair {
  const priv = x25519.utils.randomSecretKey();
  const pub = x25519.getPublicKey(priv);
  return { publicKey: bytesToBase64url(pub), privateKey: bytesToBase64url(priv) };
}

/**
 * Derive the shared AES-GCM key from our private key, the peer's public key,
 * and a pairing salt that both sides agree on (from the pairing payload).
 */
export async function deriveSharedKey(
  ourPrivateKey: string,
  peerPublicKey: string,
  pairingSaltB64: string,
): Promise<CryptoKey> {
  const shared = x25519.getSharedSecret(
    base64urlToBytes(ourPrivateKey),
    base64urlToBytes(peerPublicKey),
  );
  const salt = base64urlToBytes(pairingSaltB64);
  const raw = hkdf(sha256, shared, salt, HKDF_INFO, 32);
  return subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export interface Sealed {
  nonce: string;
  ciphertext: string;
}

/** Encrypt a UTF-8 string with the shared key. */
export async function seal(key: CryptoKey, plaintext: string): Promise<Sealed> {
  const nonce = (globalThis.crypto as Crypto).getRandomValues(new Uint8Array(NONCE_BYTES));
  const ct = await subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    key,
    utf8ToBytes(plaintext) as BufferSource,
  );
  return { nonce: bytesToBase64url(nonce), ciphertext: bytesToBase64url(new Uint8Array(ct)) };
}

/** Decrypt back to a UTF-8 string. Throws if the auth tag fails. */
export async function open(key: CryptoKey, sealed: Sealed): Promise<string> {
  const pt = await subtle.decrypt(
    { name: 'AES-GCM', iv: base64urlToBytes(sealed.nonce) as BufferSource },
    key,
    base64urlToBytes(sealed.ciphertext) as BufferSource,
  );
  return bytesToUtf8(new Uint8Array(pt));
}

/** Generate a base64url random secret/salt of `n` bytes (default 32). */
export function randomSecret(n = 32): string {
  return bytesToBase64url((globalThis.crypto as Crypto).getRandomValues(new Uint8Array(n)));
}

/** Generate a short, human-typable pairing code (uppercase, no ambiguous chars). */
export function randomPairingCode(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = (globalThis.crypto as Crypto).getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

/** Stable room id derived from a GitHub user id + random salt. */
export function deriveRoomId(githubUserId: string, saltB64: string): string {
  const h = sha256(utf8ToBytes(`${githubUserId}:${saltB64}`));
  return 'room-' + bytesToBase64url(h.slice(0, 12));
}

/**
 * Derive a one-way pairing proof from the pairing secret. Both the extension
 * (which created the secret after a GitHub-verified sign-in) and the phone
 * (which scanned the QR containing the secret) can compute this. The relay
 * stores the extension's proof as the room "claim" and checks the phone's proof
 * against it — so scanning the QR is sufficient to authorize the phone without a
 * separate GitHub login. The proof is a hash, so the relay never learns the
 * secret and cannot derive the E2E key (which also needs the private keys).
 */
export function pairingProof(secretB64: string): string {
  const h = sha256(utf8ToBytes(`vsrchat-pair-proof:v1:${secretB64}`));
  return bytesToBase64url(h);
}
