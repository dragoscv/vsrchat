/** base64url helpers that work in both Node and the browser. */

// `Buffer` fallback for legacy runtimes without btoa/atob. Accessed via
// globalThis so this isomorphic package needs no @types/node dependency.
interface BufferLike {
  from(input: Uint8Array | string, enc?: string): Uint8Array & { toString(enc: string): string };
}
const nodeBuffer = (globalThis as unknown as { Buffer?: BufferLike }).Buffer;

export function bytesToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa === 'function' ? btoa(bin) : nodeBuffer!.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const norm = b64 + pad;
  if (typeof atob === 'function') {
    const bin = atob(norm);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(nodeBuffer!.from(norm, 'base64'));
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export const utf8ToBytes = (s: string): Uint8Array => enc.encode(s);
export const bytesToUtf8 = (b: Uint8Array): string => dec.decode(b);
