import { describe, expect, it } from 'vitest';
import { RoomRegistry, type RoomMember } from './rooms.js';

function member(role: 'ext' | 'pwa'): RoomMember {
  // socket is unused by the registry logic under test.
  return { socket: {} as never, role, githubId: '1' };
}

describe('RoomRegistry', () => {
  it('joins and counts members', () => {
    const r = new RoomRegistry(4);
    const a = member('ext');
    expect(r.join('room-1', a)).toEqual({ ok: true, peers: 1 });
    expect(r.count('room-1')).toBe(1);
  });

  it('enforces max peers', () => {
    const r = new RoomRegistry(1);
    expect(r.join('room-1', member('ext')).ok).toBe(true);
    const res = r.join('room-1', member('pwa'));
    expect(res).toEqual({ ok: false, reason: 'room-full' });
  });

  it('returns other members only', () => {
    const r = new RoomRegistry(4);
    const a = member('ext');
    const b = member('pwa');
    r.join('room-1', a);
    r.join('room-1', b);
    expect(r.others('room-1', a)).toEqual([b]);
    expect(r.others('room-1', b)).toEqual([a]);
  });

  it('cleans up empty rooms on leave', () => {
    const r = new RoomRegistry(4);
    const a = member('ext');
    r.join('room-1', a);
    r.leave('room-1', a);
    expect(r.count('room-1')).toBe(0);
  });
});
