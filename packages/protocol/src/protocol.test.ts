import { describe, expect, it } from 'vitest';
import {
  AppMessageSchema,
  PairingPayloadSchema,
  PROTOCOL_VERSION,
  RelayFrameSchema,
  SealedEnvelopeSchema,
} from './index.js';

describe('protocol', () => {
  it('validates a join relay frame', () => {
    const frame = {
      t: 'join',
      room: 'room-abcdef12',
      role: 'ext',
      auth: 'gho_token',
      protocol: PROTOCOL_VERSION,
    };
    expect(RelayFrameSchema.parse(frame)).toEqual(frame);
  });

  it('rejects a join frame with a short room', () => {
    expect(() =>
      RelayFrameSchema.parse({ t: 'join', room: 'x', role: 'ext', auth: 'a', protocol: 1 }),
    ).toThrow();
  });

  it('validates a sealed envelope', () => {
    const env = {
      t: 'sealed',
      room: 'room-abcdef12',
      from: 'pwa',
      nonce: 'bm9uY2U',
      ciphertext: 'Y2lwaGVy',
      seq: 3,
    };
    expect(SealedEnvelopeSchema.parse(env)).toEqual(env);
  });

  it('validates a prompt.send app message', () => {
    const msg = { k: 'prompt.send', text: 'hello', model: 'gpt-4o' };
    expect(AppMessageSchema.parse(msg)).toMatchObject({ k: 'prompt.send' });
  });

  it('validates a session.delta app message', () => {
    const msg = {
      k: 'session.delta',
      sessionId: 's1',
      messageId: 'm1',
      role: 'assistant',
      chunk: 'partial',
    };
    expect(AppMessageSchema.parse(msg)).toMatchObject({ k: 'session.delta' });
  });

  it('validates a pairing payload', () => {
    const p = {
      v: 1,
      relay: 'wss://relay.vsrchat.app',
      room: 'room-abcdef12',
      pub: 'cHVi',
      secret: 'c2VjcmV0',
      exp: Date.now() + 60000,
    };
    expect(PairingPayloadSchema.parse(p)).toMatchObject({ v: 1 });
  });
});
