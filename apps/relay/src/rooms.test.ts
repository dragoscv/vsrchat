import { describe, expect, it } from 'vitest';
import { RoomRegistry, type RoomMember } from './rooms.js';

let pidSeq = 0;
function member(role: 'ext' | 'pwa', cid?: string): RoomMember {
  // socket is unused by the registry logic under test.
  return { socket: {} as never, role, githubId: '1', pid: `pid-${pidSeq++}`, cid };
}

describe('RoomRegistry', () => {
  it('joins and counts members', () => {
    const r = new RoomRegistry(4);
    const a = member('ext');
    expect(r.join('room-1', a)).toEqual({ ok: true, peers: 1, evicted: [] });
    expect(r.count('room-1')).toBe(1);
  });

  it('enforces max peers', () => {
    const r = new RoomRegistry(1);
    expect(r.join('room-1', member('ext')).ok).toBe(true);
    const res = r.join('room-1', member('pwa'));
    expect(res).toEqual({ ok: false, reason: 'room-full' });
  });

  it('evicts a stale connection from the same client id (cid) on rejoin', () => {
    const r = new RoomRegistry(4);
    const a = member('ext', 'win-1');
    const b = member('ext', 'win-1');
    r.join('room-1', a);
    const res = r.join('room-1', b);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.evicted).toEqual([a]);
    expect(r.count('room-1')).toBe(1); // a replaced by b
  });

  it('allows multiple phones (pwa) without eviction', () => {
    const r = new RoomRegistry(9);
    r.join('room-1', member('ext', 'win-1'));
    const p1 = r.join('room-1', member('pwa', 'phone-1'));
    const p2 = r.join('room-1', member('pwa', 'phone-2'));
    expect(p1.ok && p2.ok).toBe(true);
    if (p2.ok) expect(p2.evicted).toEqual([]);
    expect(r.count('room-1')).toBe(3); // ext + 2 phones
  });

  it('allows multiple extension windows (different cids)', () => {
    const r = new RoomRegistry(9);
    const w1 = r.join('room-1', member('ext', 'win-1'));
    const w2 = r.join('room-1', member('ext', 'win-2'));
    expect(w1.ok && w2.ok).toBe(true);
    if (w2.ok) expect(w2.evicted).toEqual([]);
    expect(r.count('room-1')).toBe(2); // two windows coexist
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
