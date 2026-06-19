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
    /** GitHub OAuth token proof (verified server-side, then discarded). */
    auth: z.string().min(1),
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

/** Anything that can travel over the socket. */
export const WireFrameSchema = z.union([RelayFrameSchema, SealedEnvelopeSchema]);
export type WireFrame = z.infer<typeof WireFrameSchema>;
