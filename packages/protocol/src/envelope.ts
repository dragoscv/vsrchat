import { z } from 'zod';

/** Current wire protocol version. Bump on breaking envelope changes. */
export const PROTOCOL_VERSION = 1 as const;

/** Which peer a frame came from. */
export const PeerSchema = z.enum(['ext', 'pwa']);
export type Peer = z.infer<typeof PeerSchema>;

/**
 * The signaling/control frames the RELAY itself understands (plaintext).
 * The relay routes by `room` and never inspects `data` of `relay` frames.
 */
export const RelayFrameSchema = z.discriminatedUnion('t', [
  /** Peer announces itself + which room to join. Relay validates auth + allowlist. */
  z.object({
    t: z.literal('join'),
    room: z.string().min(8).max(128),
    role: PeerSchema,
    /**
     * GitHub OAuth token (verified server-side, then discarded). Required for
     * the peer that CLAIMS a room (the extension). Optional for a peer that
     * joins via pairing proof (the phone after scanning the QR).
     */
    auth: z.string().min(1).optional(),
    /**
     * Pairing proof = hash of the pairing secret. The claimer (extension) sends
     * it alongside `auth` to register the room's proof; a joiner (phone) sends
     * it instead of `auth` to prove it scanned the QR.
     */
    proof: z.string().min(1).optional(),
    protocol: z.literal(PROTOCOL_VERSION),
  }),
  /** Relay -> peer: join accepted. */
  z.object({ t: z.literal('joined'), room: z.string(), peers: z.number().int().nonnegative() }),
  /** Relay -> peer: the other peer connected/disconnected. */
  z.object({ t: z.literal('peer'), role: PeerSchema, online: z.boolean() }),
  /** Relay <-> peer: liveness. */
  z.object({ t: z.literal('ping') }),
  z.object({ t: z.literal('pong') }),
  /** Relay -> peer: an error occurred (auth failed, room full, etc.). */
  z.object({ t: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type RelayFrame = z.infer<typeof RelayFrameSchema>;

/**
 * The encrypted application envelope. The relay forwards these opaquely.
 * `ciphertext` and `nonce` are base64url. Plaintext is an `AppMessage`.
 */
export const SealedEnvelopeSchema = z.object({
  t: z.literal('sealed'),
  room: z.string(),
  from: PeerSchema,
  /** base64url AES-GCM nonce (12 bytes). */
  nonce: z.string().min(1),
  /** base64url AES-GCM ciphertext (includes auth tag). */
  ciphertext: z.string().min(1),
  /** Monotonic per-sender counter to detect replay/reordering. */
  seq: z.number().int().nonnegative(),
});
export type SealedEnvelope = z.infer<typeof SealedEnvelopeSchema>;

/**
 * Plaintext key-exchange frame. Carries a peer's X25519 PUBLIC key so the other
 * side can complete ECDH. Public keys are safe to send in clear; the relay
 * forwards these opaquely (like sealed envelopes) and cannot derive the shared
 * secret without a private key.
 */
export const KeyExchangeFrameSchema = z.object({
  t: z.literal('kx'),
  room: z.string(),
  from: PeerSchema,
  /** base64url X25519 public key. */
  pub: z.string().min(1),
});
export type KeyExchangeFrame = z.infer<typeof KeyExchangeFrameSchema>;

/** Anything that can travel over the socket. */
export const WireFrameSchema = z.union([
  RelayFrameSchema,
  SealedEnvelopeSchema,
  KeyExchangeFrameSchema,
]);
export type WireFrame = z.infer<typeof WireFrameSchema>;
