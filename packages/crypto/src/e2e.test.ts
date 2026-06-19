import { describe, expect, it } from 'vitest';
import {
  deriveRoomId,
  deriveSharedKey,
  generateKeyPair,
  open,
  randomPairingCode,
  randomSecret,
  seal,
} from './index.js';

describe('e2e crypto', () => {
  it('two parties derive the same key and can exchange messages', async () => {
    const ext = generateKeyPair();
    const pwa = generateKeyPair();
    const salt = randomSecret(32);

    const extKey = await deriveSharedKey(ext.privateKey, pwa.publicKey, salt);
    const pwaKey = await deriveSharedKey(pwa.privateKey, ext.publicKey, salt);

    const sealed = await seal(extKey, 'hello from extension 🛰️');
    const plain = await open(pwaKey, sealed);
    expect(plain).toBe('hello from extension 🛰️');
  });

  it('fails to decrypt with the wrong key', async () => {
    const ext = generateKeyPair();
    const pwa = generateKeyPair();
    const attacker = generateKeyPair();
    const salt = randomSecret();

    const extKey = await deriveSharedKey(ext.privateKey, pwa.publicKey, salt);
    const wrongKey = await deriveSharedKey(attacker.privateKey, ext.publicKey, salt);

    const sealed = await seal(extKey, 'secret');
    await expect(open(wrongKey, sealed)).rejects.toBeDefined();
  });

  it('different salts produce different keys', async () => {
    const ext = generateKeyPair();
    const pwa = generateKeyPair();
    const k1 = await deriveSharedKey(ext.privateKey, pwa.publicKey, randomSecret());
    const k2 = await deriveSharedKey(pwa.privateKey, ext.publicKey, randomSecret());
    const sealed = await seal(k1, 'x');
    await expect(open(k2, sealed)).rejects.toBeDefined();
  });

  it('pairing codes are the right length and alphabet', () => {
    const code = randomPairingCode(8);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it('room ids are stable for the same inputs', () => {
    const salt = randomSecret();
    expect(deriveRoomId('12345', salt)).toBe(deriveRoomId('12345', salt));
    expect(deriveRoomId('12345', salt)).not.toBe(deriveRoomId('99999', salt));
  });
});
