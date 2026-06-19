'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { deriveSharedKey } from '@vsrchat/crypto';
import type { AppMessage, ExtMessage } from '@vsrchat/protocol';
import { BrowserRelayClient } from './relay-client';
import { cacheDetail, cacheSessions, readCachedSessions } from './cache';
import { loadPairing, type PwaPairing } from './pairing-store';
import { useVsr } from './store';

interface ConnectionApi {
  ready: boolean;
  paired: boolean;
  send: (msg: AppMessage) => void;
  reconnect: () => void;
}

const Ctx = createContext<ConnectionApi | null>(null);

export function useConnection(): ConnectionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConnection must be used within <ConnectionProvider>');
  return ctx;
}

export function ConnectionProvider({
  authToken,
  children,
}: {
  authToken: string;
  children: React.ReactNode;
}) {
  const clientRef = useRef<BrowserRelayClient | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const [ready, setReady] = useState(false);
  const [paired, setPaired] = useState(false);
  const store = useVsr();

  const handleMessage = useCallback(
    (msg: AppMessage) => {
      const m = msg as ExtMessage;
      switch (m.k) {
        case 'sessions.snapshot':
          store.setSessions(m.sessions);
          if (keyRef.current) void cacheSessions(keyRef.current, m.sessions);
          break;
        case 'session.snapshot':
          store.setDetail(m.session);
          if (keyRef.current) void cacheDetail(keyRef.current, m.session);
          break;
        case 'session.delta':
          store.appendDelta(m.sessionId, m.messageId, m.chunk, m.done, m.model);
          break;
        case 'models.snapshot':
          store.setModels(m.models);
          break;
        case 'agents.snapshot':
          store.setAgents(m.agents);
          break;
        case 'tool.request':
          store.addTool(m.call);
          break;
        case 'tool.resolved':
          store.resolveTool(m.id);
          break;
        case 'notify':
          void postLocalNotification(m.title, m.body);
          break;
        default:
          break;
      }
    },
    [store],
  );

  const start = useCallback(
    async (pairing: PwaPairing) => {
      const key = await deriveSharedKey(pairing.keyPair.privateKey, pairing.extPublicKey, pairing.salt);
      keyRef.current = key;

      // Warm UI from encrypted cache before the PC is online.
      const cached = await readCachedSessions(key);
      if (cached.length) store.setSessions(cached);

      const client = new BrowserRelayClient({
        relayUrl: pairing.relay,
        room: pairing.room,
        authToken,
        key,
        onMessage: handleMessage,
        onStatus: (s) => {
          store.setStatus(s);
          if (s === 'peer-online') {
            store.setPcOnline(true);
            void client.send({ k: 'hello', client: 'pwa', version: '0.1.0' });
            void client.send({ k: 'sessions.list' });
            void client.send({ k: 'models.list' });
            void client.send({ k: 'agent.list' });
          }
          if (s === 'peer-offline' || s === 'closed') store.setPcOnline(false);
        },
      });
      clientRef.current = client;
      client.connect();
      setReady(true);
    },
    [authToken, handleMessage, store],
  );

  useEffect(() => {
    const pairing = loadPairing();
    setPaired(!!pairing);
    if (pairing) void start(pairing);
    return () => clientRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api: ConnectionApi = {
    ready,
    paired,
    send: (msg) => void clientRef.current?.send(msg),
    reconnect: () => {
      const pairing = loadPairing();
      if (pairing) void start(pairing);
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

async function postLocalNotification(title: string, body: string): Promise<void> {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png' });
    else new Notification(title, { body });
  }
}
