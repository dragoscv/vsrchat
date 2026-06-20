import { serve } from '@hono/node-server';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  KeyExchangeFrameSchema,
  RelayFrameSchema,
  SealedEnvelopeSchema,
  WireFrameSchema,
  type Peer,
} from '@vsrchat/protocol';
import { loadConfig } from './config.js';
import { verifyGithubToken } from './github.js';
import { RoomRegistry, type RoomMember } from './rooms.js';

const config = loadConfig();
const rooms = new RoomRegistry(config.maxPeersPerRoom);

// ---- HTTP app (health + landing). The /health name avoids Google's reserved /healthz. ----
const app = new Hono();
app.get('/health', (c) => c.json({ ok: true, service: 'vsrchat-relay', ts: Date.now() }));
app.get('/', (c) =>
  c.json({
    name: 'vsrchat-relay',
    description: 'End-to-end-encrypted WebSocket broker for VS Remote Chat. Forwards ciphertext only.',
    ws: '/ws',
  }),
);

// Hono handles plain HTTP requests; serve returns the underlying Node server.
const httpServer = serve({ fetch: app.fetch, port: config.port }, () => {
  // eslint-disable-next-line no-console
  console.log(`[vsrchat-relay] listening on :${config.port} (ws path /ws)`);
});

// ---- WebSocket broker on the same server, path /ws ----
const wss = new WebSocketServer({ server: httpServer as never, path: '/ws' });

interface SocketState {
  member?: RoomMember;
  room?: string;
  alive: boolean;
}

function send(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function fail(ws: WebSocket, code: string, message: string): void {
  send(ws, { t: 'error', code, message });
  ws.close(1008, code);
}

wss.on('connection', (ws: WebSocket) => {
  const state: SocketState = { alive: true };

  ws.on('pong', () => {
    state.alive = true;
  });

  ws.on('message', async (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return fail(ws, 'bad-json', 'Frame was not valid JSON.');
    }

    const frame = WireFrameSchema.safeParse(parsed);
    if (!frame.success) {
      return fail(ws, 'bad-frame', 'Frame did not match the protocol.');
    }

    // --- Control frames understood by the relay ---
    const relay = RelayFrameSchema.safeParse(parsed);
    if (relay.success) {
      const f = relay.data;
      if (f.t === 'ping') return send(ws, { t: 'pong' });
      if (f.t === 'pong') return;
      if (f.t === 'join') {
        if (state.member) return fail(ws, 'already-joined', 'Socket already joined a room.');

        // Two ways to authorize a join:
        //  1. GitHub token (the extension): verified against the allowlist. If a
        //     `proof` is included, it becomes (or refreshes) the room's claim.
        //  2. Pairing proof only (the phone after scanning the QR): must match
        //     the room's existing claim — no separate GitHub login required.
        let identity: { id: string; login: string } | null = null;
        if (f.auth) {
          identity = await verifyGithubToken(f.auth, config);
          if (!identity) return fail(ws, 'unauthorized', 'GitHub auth failed or not allowlisted.');
          if (f.proof) {
            rooms.setClaim(f.room, { proof: f.proof, githubId: identity.id, login: identity.login });
          }
        } else if (f.proof) {
          const claim = rooms.getClaim(f.room);
          if (!claim) {
            return fail(
              ws,
              'awaiting-claim',
              'Pair from VS Code first so this device can join.',
            );
          }
          if (claim.proof !== f.proof) {
            return fail(ws, 'unauthorized', 'Pairing proof did not match this room.');
          }
          identity = { id: claim.githubId, login: claim.login };
        } else {
          return fail(ws, 'unauthorized', 'No GitHub token or pairing proof provided.');
        }

        const pid = randomUUID();
        const member: RoomMember = { socket: ws, role: f.role as Peer, githubId: identity.id, pid };
        const result = rooms.join(f.room, member);
        if (!result.ok) return fail(ws, result.reason, 'Could not join room.');

        // Close any stale same-role sockets that were just evicted.
        for (const old of result.evicted) {
          try {
            old.socket.close(4000, 'superseded');
          } catch {
            /* ignore */
          }
        }

        state.member = member;
        state.room = f.room;
        send(ws, { t: 'joined', room: f.room, peers: result.peers, pid });

        // Notify existing peers that a new peer is online, and tell the
        // newcomer who is already present.
        for (const other of rooms.others(f.room, member)) {
          send(other.socket, { t: 'peer', role: member.role, online: true, pid: member.pid });
          send(ws, { t: 'peer', role: other.role, online: true, pid: other.pid });
        }
        return;
      }
      // 'joined' / 'peer' / 'error' are server->client only; ignore if received.
      return;
    }

    // --- Sealed envelopes: forward opaquely to the other peer(s) in the room ---
    const sealed = SealedEnvelopeSchema.safeParse(parsed);
    if (sealed.success) {
      if (!state.member || !state.room) {
        return fail(ws, 'not-joined', 'Must join a room before sending.');
      }
      if (sealed.data.room !== state.room) {
        return fail(ws, 'room-mismatch', 'Envelope room does not match joined room.');
      }
      // Stamp the sender's pid so peers can tell devices apart.
      const out = { ...sealed.data, pid: state.member.pid };
      // The relay NEVER decrypts. It just relays the ciphertext to peers.
      for (const other of rooms.others(state.room, state.member)) {
        if (out.to && other.pid !== out.to) continue; // targeted delivery
        send(other.socket, out);
      }
      return;
    }

    // --- Key-exchange frames: forward plaintext public keys to peers ---
    const kx = KeyExchangeFrameSchema.safeParse(parsed);
    if (kx.success) {
      if (!state.member || !state.room) {
        return fail(ws, 'not-joined', 'Must join a room before sending.');
      }
      if (kx.data.room !== state.room) {
        return fail(ws, 'room-mismatch', 'Frame room does not match joined room.');
      }
      const out = { ...kx.data, pid: state.member.pid };
      for (const other of rooms.others(state.room, state.member)) {
        if (out.to && other.pid !== out.to) continue;
        send(other.socket, out);
      }
      return;
    }
  });

  ws.on('close', () => {
    if (state.member && state.room) {
      const { room, member } = { room: state.room, member: state.member };
      rooms.leave(room, member);
      for (const other of rooms.others(room, member)) {
        send(other.socket, { t: 'peer', role: member.role, online: false, pid: member.pid });
      }
    }
  });

  ws.on('error', () => {
    /* swallow; close handler does cleanup */
  });
});

// Liveness: ping clients, drop dead sockets.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    const anyWs = ws as WebSocket & { __state?: SocketState };
    if (anyWs.readyState !== anyWs.OPEN) continue;
    ws.ping();
  }
}, 30_000);
heartbeat.unref?.();

export { app, wss };
