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

  join(room: string, member: RoomMember): { ok: true; peers: number } | { ok: false; reason: string } {
    let set = this.rooms.get(room);
    if (!set) {
      set = new Set();
      this.rooms.set(room, set);
    }
    if (set.size >= this.maxPeersPerRoom) {
      return { ok: false, reason: 'room-full' };
    }
    set.add(member);
    return { ok: true, peers: set.size };
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
