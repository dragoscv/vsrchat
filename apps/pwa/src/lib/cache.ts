'use client';

import { seal, open } from '@vsrchat/crypto';
import type { SessionDetail, SessionSummary } from '@vsrchat/protocol';

/**
 * Encrypted offline cache of seen sessions in IndexedDB. Everything is sealed
 * with the same E2E key, so even local storage is encrypted at rest.
 */
const DB = 'vsrchat';
const STORE = 'cache';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(k: string, v: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get(k: string): Promise<string | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(k);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheSessions(key: CryptoKey, sessions: SessionSummary[]): Promise<void> {
  const sealed = await seal(key, JSON.stringify(sessions));
  await put('sessions', JSON.stringify(sealed));
}

export async function readCachedSessions(key: CryptoKey): Promise<SessionSummary[]> {
  const raw = await get('sessions');
  if (!raw) return [];
  try {
    const plain = await open(key, JSON.parse(raw));
    return JSON.parse(plain) as SessionSummary[];
  } catch {
    return [];
  }
}

export async function cacheDetail(key: CryptoKey, detail: SessionDetail): Promise<void> {
  const sealed = await seal(key, JSON.stringify(detail));
  await put(`detail:${detail.id}`, JSON.stringify(sealed));
}

export async function readCachedDetail(
  key: CryptoKey,
  id: string,
): Promise<SessionDetail | undefined> {
  const raw = await get(`detail:${id}`);
  if (!raw) return undefined;
  try {
    const plain = await open(key, JSON.parse(raw));
    return JSON.parse(plain) as SessionDetail;
  } catch {
    return undefined;
  }
}
