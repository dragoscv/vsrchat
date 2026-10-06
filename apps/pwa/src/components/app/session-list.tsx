'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, Reorder, motion } from 'motion/react';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';
import type { SessionSummary } from '@vsrchat/protocol';
import { SessionListSkeleton } from './skeletons';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function SessionList({ onOpen }: { onOpen: () => void }) {
  const { send } = useConnection();
  const sessions = useVsr((s) => s.sessions);
  const openTab = useVsr((s) => s.openTab);
  const active = useVsr((s) => s.activeSessionId);
  const unread = useVsr((s) => s.unread);
  const prefs = useVsr((s) => s.prefs);
  const setPrefs = useVsr((s) => s.setPrefs);
  const togglePin = useVsr((s) => s.togglePin);
  const reorderSessions = useVsr((s) => s.reorderSessions);
  const loadedOnce = useVsr((s) => s.loadedOnce);
  const pcOnline = useVsr((s) => s.pcOnline);
  const windows = useVsr((s) => s.windows);
  const [showFilters, setShowFilters] = useState(false);

  // Set of workspace ids that belong to currently-connected windows.
  const openWorkspaceIds = useMemo(
    () => new Set(Object.values(windows).map((w) => w.workspaceId).filter(Boolean) as string[]),
    [windows],
  );

  const filtered = useMemo(() => {
    let list = sessions.slice();
    if (!prefs.showAllWorkspaces && openWorkspaceIds.size > 0) {
      list = list.filter((s) => !s.workspaceId || openWorkspaceIds.has(s.workspaceId));
    }
    if (prefs.filterSource !== 'all') list = list.filter((s) => s.source === prefs.filterSource);
    if (prefs.filterUnread) list = list.filter((s) => unread[s.id]);
    const q = prefs.search.trim().toLowerCase();
    if (q) list = list.filter((s) => s.title.toLowerCase().includes(q) || (s.workspace ?? '').toLowerCase().includes(q));

    const dir = prefs.sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let r = 0;
      if (prefs.sortKey === 'recent') r = a.updatedAt - b.updatedAt;
      else if (prefs.sortKey === 'name') r = a.title.localeCompare(b.title);
      else r = a.messageCount - b.messageCount;
      return r * dir;
    });

    // Manual order (if set) takes priority for the sessions it covers.
    if (prefs.manualOrder.length) {
      const pos = new Map(prefs.manualOrder.map((id, i) => [id, i] as const));
      list.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
    }
    // Pinned float to top.
    list.sort((a, b) => Number(prefs.pinned.includes(b.id)) - Number(prefs.pinned.includes(a.id)));
    return list;
  }, [sessions, prefs, unread, openWorkspaceIds]);

  const openSession = (id: string) => {
    openTab(id);
    if (!useVsr.getState().details[id]) {
      useVsr.getState().setLoadingDetail(id, true);
      send({ k: 'session.get', id });
    }
    onOpen();
  };

  const newChat = () => send({ k: 'chat.new' });
  const startRename = (id: string, current: string) => {
    const title = window.prompt('Rename chat', current);
    if (title && title.trim() && title !== current) send({ k: 'session.rename', id, title: title.trim() });
  };
  const doDelete = (id: string, title: string) => {
    if (window.confirm(`Delete "${title}"? This can't be undone.`)) send({ k: 'session.delete', id });
  };

  const ids = filtered.map((s) => s.id);

  return (
    <div className="list-root">
      <div className="list-head">
        <div className="title-row">
          <strong>Sessions</strong>
          <span className="count">{filtered.length}</span>
          <span className="spacer" />
          <button className="icon" onClick={() => setShowFilters((v) => !v)} title="Filters & sort" aria-label="Filters">⚙︎</button>
          <button className="new" onClick={newChat}>＋ New</button>
        </div>
        <div className="search">
          <span className="search-icon">🔍</span>
          <input
            value={prefs.search}
            onChange={(e) => setPrefs({ search: e.target.value })}
            placeholder="Search sessions…"
            aria-label="Search sessions"
          />
          {prefs.search && <button className="clear" onClick={() => setPrefs({ search: '' })} aria-label="Clear">×</button>}
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              className="filters"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="frow">
                <label>Sort</label>
                <select value={prefs.sortKey} onChange={(e) => setPrefs({ sortKey: e.target.value as never })}>
                  <option value="recent">Recent</option>
                  <option value="name">Name</option>
                  <option value="messages">Messages</option>
                </select>
                <button className="chip" onClick={() => setPrefs({ sortDir: prefs.sortDir === 'asc' ? 'desc' : 'asc' })}>
                  {prefs.sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
              <div className="frow">
                <label>Source</label>
                <select value={prefs.filterSource} onChange={(e) => setPrefs({ filterSource: e.target.value as never })}>
                  <option value="all">All</option>
                  <option value="managed">Live</option>
                  <option value="mirror">Mirror</option>
                </select>
                <button className={`chip ${prefs.filterUnread ? 'on' : ''}`} onClick={() => setPrefs({ filterUnread: !prefs.filterUnread })}>
                  Unread
                </button>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={prefs.showAllWorkspaces} onChange={(e) => setPrefs({ showAllWorkspaces: e.target.checked })} />
                Show all workspaces (not just open ones)
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="list-scroll">
        {!loadedOnce && !sessions.length ? (
          <SessionListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="emoji">🗂️</div>
            <p>{sessions.length ? 'No sessions match your filters.' : pcOnline ? 'No sessions yet.' : 'Waiting for VS Code…'}</p>
            <button className="new" onClick={newChat}>Start a new chat</button>
          </div>
        ) : (
          <Reorder.Group axis="y" values={ids} onReorder={reorderSessions} as="div" className="rows">
            {filtered.map((s) => (
              <Reorder.Item
                key={s.id}
                value={s.id}
                as="div"
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                whileDrag={{ scale: 1.02 }}
                className={`row ${active === s.id ? 'active' : ''}`}
                onClick={() => openSession(s.id)}
              >
                <div className="row-main">
                  <span className="row-title">
                    {prefs.pinned.includes(s.id) && <span className="pin-i">📌</span>}
                    {unread[s.id] && active !== s.id && <span className="dot" />}
                    <span className="truncate-1">{s.title || 'Untitled'}</span>
                  </span>
                  <div className="row-actions">
                    <button className="act" title="Pin" onClick={(e) => { e.stopPropagation(); togglePin(s.id); }}>
                      {prefs.pinned.includes(s.id) ? '📌' : '📍'}
                    </button>
                    {s.source === 'managed' && (
                      <>
                        <button className="act" title="Rename" onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }}>✎</button>
                        <button className="act danger" title="Delete" onClick={(e) => { e.stopPropagation(); doDelete(s.id, s.title); }}>🗑</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="row-meta">
                  <span className={`badge ${s.source}`}>{s.source === 'managed' ? 'live' : 'mirror'}</span>
                  {s.workspace && <span className="ws truncate-1">{s.workspace}</span>}
                  <span className="spacer" />
                  <span className="time">{s.messageCount} · {relativeTime(s.updatedAt)}</span>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <style>{`
        .list-root { display: flex; flex-direction: column; height: 100%; min-height: 0;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: 18px; overflow: hidden; backdrop-filter: blur(12px); }
        .list-head { padding: 12px 12px 8px; border-bottom: 1px solid var(--color-border);
          display: flex; flex-direction: column; gap: 8px; }
        .title-row { display: flex; align-items: center; gap: 8px; }
        .title-row strong { font-size: 14px; }
        .count { font-size: 11px; color: var(--color-fg-dim); background: rgba(255,255,255,.05);
          padding: 1px 7px; border-radius: 999px; }
        .spacer { flex: 1; }
        .icon { background: transparent; border: 1px solid var(--color-border); color: var(--color-fg-muted);
          border-radius: 9px; width: 30px; height: 30px; cursor: pointer; }
        .new { background: linear-gradient(100deg, var(--color-accent), var(--color-accent-2));
          color: #06060b; border: none; border-radius: 10px; padding: 6px 12px; font-size: 12px;
          font-weight: 700; cursor: pointer; }
        .search { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 10px; font-size: 12px; opacity: .6; }
        .search input { width: 100%; padding: 8px 28px; border-radius: 11px; font-size: 13px;
          background: rgba(255,255,255,.04); border: 1px solid var(--color-border); color: var(--color-fg); }
        .clear { position: absolute; right: 6px; background: transparent; border: none;
          color: var(--color-fg-dim); font-size: 16px; cursor: pointer; }
        .filters { overflow: hidden; display: flex; flex-direction: column; gap: 8px; }
        .frow { display: flex; align-items: center; gap: 8px; }
        .frow label { font-size: 11px; color: var(--color-fg-dim); width: 48px; }
        .frow select { flex: 1; background: rgba(255,255,255,.04); border: 1px solid var(--color-border);
          color: var(--color-fg); border-radius: 9px; padding: 5px 8px; font-size: 12px; }
        .chip { background: rgba(255,255,255,.04); border: 1px solid var(--color-border);
          color: var(--color-fg-muted); border-radius: 9px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
        .chip.on { background: rgba(124,92,255,.18); color: #c9c4ff; border-color: var(--color-border-strong); }
        .toggle { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-fg-muted); }
        .list-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
          padding: 8px 0; }
        .rows { display: flex; flex-direction: column; gap: 6px; padding: 0 10px; }
        .row { box-sizing: border-box; width: 100%; text-align: left; cursor: pointer;
          background: rgba(255,255,255,.02); border: 1px solid var(--color-border); border-radius: 14px;
          padding: 11px 12px; color: var(--color-fg); display: flex; flex-direction: column; gap: 6px; }
        .row.active { background: rgba(124,92,255,.14); border-color: var(--color-border-strong); }
        .row-main { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
        .row-title { display: flex; align-items: center; gap: 7px; min-width: 0; font-weight: 600; font-size: 14px; }
        .pin-i { font-size: 11px; }
        .dot { width: 7px; height: 7px; border-radius: 999px; flex: 0 0 auto;
          background: var(--color-accent-2); box-shadow: 0 0 8px var(--color-accent-2); }
        .row-actions { display: flex; gap: 2px; flex: 0 0 auto; }
        .act { opacity: 0; background: transparent; border: none; cursor: pointer; color: var(--color-fg-dim);
          font-size: 13px; padding: 2px 5px; border-radius: 6px; transition: opacity .15s; }
        .row:hover .act, .row.active .act { opacity: 1; }
        .act:hover { background: rgba(255,255,255,.08); color: var(--color-fg); }
        .act.danger:hover { background: rgba(255,80,80,.16); color: #ff8a8a; }
        .row-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--color-fg-dim); min-width: 0; }
        .badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; flex: 0 0 auto; }
        .badge.managed { background: rgba(54,211,153,.14); color: #6ee7b7; }
        .badge.mirror { background: rgba(43,212,255,.12); color: #8fe3ff; }
        .ws { max-width: 45%; }
        .time { flex: 0 0 auto; }
        .empty { display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 40px 20px; color: var(--color-fg-dim); text-align: center; }
        .empty .emoji { font-size: 32px; }
      `}</style>
    </div>
  );
}
