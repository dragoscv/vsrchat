import { describe, expect, it, vi } from 'vitest';

// Minimal atob/crypto for the node test environment.
vi.stubGlobal('atob', (s: string) => Buffer.from(s, 'base64').toString('binary'));

import { decodePairingHash } from './pairing-store';

describe('decodePairingHash', () => {
  it('decodes a base64url pairing payload from the hash', () => {
    const payload = {
      v: 1,
      relay: 'wss://relay.test/ws',
      room: 'room-abcdef12',
      pub: 'cHVi',
      secret: 'c2VjcmV0',
      exp: Date.now() + 60000,
    };
    const hash = '#' + Buffer.from(JSON.stringify(payload)).toString('base64url');
    const decoded = decodePairingHash(hash);
    expect(decoded).toMatchObject({ room: 'room-abcdef12', relay: 'wss://relay.test/ws' });
  });

  it('returns null for empty or invalid hashes', () => {
    expect(decodePairingHash('')).toBeNull();
    expect(decodePairingHash('#not-valid-base64-json!!!')).toBeNull();
  });
});
