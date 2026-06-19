import { z } from 'zod';

/**
 * Pairing payload encoded into the QR code (and recoverable from the short code).
 * Carries everything the PWA needs to connect to the relay and derive the E2E key.
 *
 * The QR carries the relay URL + room + the extension's X25519 public key + a
 * one-time pairing secret. The short-code path runs a PAKE so the code alone
 * never reveals the key.
 */
export const PairingPayloadSchema = z.object({
  v: z.literal(1),
  /** Relay base URL, e.g. wss://relay.vsrchat.app */
  relay: z.string().url().or(z.string().startsWith('wss://')).or(z.string().startsWith('ws://')),
  /** Room id (derived from the GitHub user id + a random salt). */
  room: z.string().min(8),
  /** Extension's X25519 public key (base64url). */
  pub: z.string().min(1),
  /** One-time pairing secret (base64url) used to authenticate the handshake. */
  secret: z.string().min(1),
  /** GitHub login the room is locked to (display only). */
  login: z.string().optional(),
  /** Unix ms expiry; pairing payloads are short-lived. */
  exp: z.number().int(),
});
export type PairingPayload = z.infer<typeof PairingPayloadSchema>;

/** Short numeric/alpha pairing code (for camera-less pairing). */
export const PAIRING_CODE_LENGTH = 8;
export const PairingCodeSchema = z.string().length(PAIRING_CODE_LENGTH);
