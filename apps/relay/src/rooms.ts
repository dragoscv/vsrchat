import type { WebSocket } from 'ws';
import type { Peer } from '@vsrchat/protocol';

export interface RoomMember {
  socket: WebSocket;
  role: Peer;
  githubId: string;
  /** Stable per-connection peer id (assigned by the server on join). */
  pid: string;
  /** Optional display label (e.g. device name). */
  label?: string;
}

/**
 * In-memory room registry. The relay is stateless w.r.t. message HISTORY
 * (it stores nothing), but it must track live sockets to route frames.
 */
export class RoomRegistry {
  private rooms = new Map<string, Set<RoomMember>>();
  /**
   * Per-room "claim": the pairing proof + the GitHub identity of the peer that
   * created the room (the extension, after a verified GitHub sign-in). A phone
   * that scanned the QR proves it belongs by presenting the same proof.
   */
  private claims = new Map<string, { proof: string; githubId: string; login: string }>();

  constructor(private readonly maxPeersPerRoom: number) {}

  /** Register/refresh the room claim (called by the GitHub-verified claimer). */
  setClaim(room: string, claim: { proof: string; githubId: string; login: string }): void {
    this.claims.set(room, claim);
  }

  /** Look up a room claim, if one exists. */
  getClaim(room: string): { proof: string; githubId: string; login: string } | undefined {
    return this.claims.get(room);
  }

  join(
    room: string,
    member: RoomMember,
  ): { ok: true; peers: number; evicted: RoomMember[] } | { ok: false; reason: string } {
    let set = this.rooms.get(room);
    if (!set) {
      set = new Set();
      this.rooms.set(room, set);
    }
    // The extension (`ext`) is single per room, so a new ext replaces a stale
    // one (reconnect/re-pair ghost). Phones (`pwa`) are multi-device: many can
    // join the same room, so we do NOT evict other phones.
    const evicted: RoomMember[] = [];
    if (member.role === 'ext') {
      for (const m of set) {
        if (m.role === 'ext') {
          evicted.push(m);
          set.delete(m);
        }
      }
    }
    if (set.size >= this.maxPeersPerRoom) {
      return { ok: false, reason: 'room-full' };
    }
    set.add(member);
    return { ok: true, peers: set.size, evicted };
  }

  leave(room: string, member: RoomMember): void {
    const set = this.rooms.get(room);
    if (!set) return;
    set.delete(member);
    if (set.size === 0) {
      this.rooms.delete(room);
      this.claims.delete(room);
    }
  }

  /** All members of a room except `self`. */
  others(room: string, self: RoomMember): RoomMember[] {
    const set = this.rooms.get(room);
    if (!set) return [];
    return [...set].filter((m) => m !== self);
  }

  count(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }
}
