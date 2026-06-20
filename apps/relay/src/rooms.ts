import type { WebSocket } from 'ws';
import type { Peer } from '@vsrchat/protocol';

export interface RoomMember {
  socket: WebSocket;
  role: Peer;
  githubId: string;
}

/**
 * In-memory room registry. The relay is stateless w.r.t. message HISTORY
 * (it stores nothing), but it must track live sockets to route frames.
 */
export class RoomRegistry {
  private rooms = new Map<string, Set<RoomMember>>();

  constructor(private readonly maxPeersPerRoom: number) {}

  join(
    room: string,
    member: RoomMember,
  ): { ok: true; peers: number; evicted: RoomMember[] } | { ok: false; reason: string } {
    let set = this.rooms.get(room);
    if (!set) {
      set = new Set();
      this.rooms.set(room, set);
    }
    // Single-user model: a new socket for a given role replaces any stale one
    // (e.g. a reconnect or a re-pair left a ghost). This prevents phantom
    // "room-full" and stale-peer states.
    const evicted: RoomMember[] = [];
    for (const m of set) {
      if (m.role === member.role) {
        evicted.push(m);
        set.delete(m);
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
    if (set.size === 0) this.rooms.delete(room);
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
