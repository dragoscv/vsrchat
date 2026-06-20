'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';
import type { SessionSummary } from '@vsrchat/protocol';

interface WorkspaceGroup {
  id: string;
  name: string;
  path?: string;
  isActive: boolean;
  sessions: SessionSummary[];
  latest: number;
}

/** Group sessions by workspace, active workspace first, then by recency. */
function groupByWorkspace(sessions: SessionSummary[]): WorkspaceGroup[] {
  const groups = new Map<string, WorkspaceGroup>();
  for (const s of sessions) {
    const key = s.workspaceId ?? s.workspace ?? 'none';
    let g = groups.get(key);
    if (!g) {
      g = {
        id: key,
        name: s.workspace ?? 'No workspace',
        path: s.workspacePath,
        isActive: !!s.isActiveWorkspace,
        sessions: [],
        latest: 0,
      };
      groups.set(key, g);
    }
    g.sessions.push(s);
    g.isActive = g.isActive || !!s.isActiveWorkspace;
    g.latest = Math.max(g.latest, s.updatedAt);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.latest - a.latest;
  });
}

export function SessionList({ onOpen }: { onOpen: () => void }) {
  const { send } = useConnection();
  const sessions = useVsr((s) => s.sessions);
  const openTab = useVsr((s) => s.openTab);
  const active = useVsr((s) => s.activeSessionId);
  const unread = useVsr((s) => s.unread);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupByWorkspace(sessions), [sessions]);

  const openSession = (id: string) => {
    openTab(id);
    if (!useVsr.getState().details[id]) send({ k: 'session.get', id });
    onOpen();
  };

  const newChat = () => {
    send({ k: 'chat.new' });
  };

  const startRename = (id: string, current: string) => {
    const title = window.prompt('Rename chat', current);
    if (title && title.trim() && title !== current) send({ k: 'session.rename', id, title: title.trim() });
  };

  const doDelete = (id: string, title: string) => {
    if (window.confirm(`Delete "${title}"? This can't be undone.`)) send({ k: 'session.delete', id });
  };

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="glass" style={{ borderRadius: 18, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 14 }}>Sessions</strong>
        <button onClick={newChat} className="new-btn">＋ New</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '0 10px 10px', display: 'grid', gap: 10 }}>
        {sessions.length === 0 && (
          <p style={{ color: 'var(--color-fg-dim)', fontSize: 13, padding: 12, textAlign: 'center' }}>
            No sessions yet. Start a new chat or wait for your PC to sync.
          </p>
        )}
        {groups.map((g) => (
          <div key={g.id} style={{ display: 'grid', gap: 8 }}>
            <button
              onClick={() => toggle(g.id)}
              className="ws-header"
              title={g.path ?? g.name}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ opacity: 0.7 }}>{collapsed[g.id] ? '▸' : '▾'}</span>
                <span style={{ fontSize: 14 }}>{g.isActive ? '🟢' : '📁'}</span>
                <span className="ws-name">{g.name}</span>
                {g.isActive && <span className="ws-active">active</span>}
              </span>
              <span className="ws-count">{g.sessions.length}</span>
            </button>

            {!collapsed[g.id] &&
              g.sessions
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((s, i) => (
          <motion.div
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => openSession(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') openSession(s.id); }}
            className="glass-hover row"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            style={{
              marginLeft: 10,
              background: active === s.id ? 'rgba(124,92,255,.14)' : 'rgba(255,255,255,.02)',
              border: `1px solid ${active === s.id ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
              borderRadius: 14,
              padding: 12,
              cursor: 'pointer',
              color: 'var(--color-fg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                {unread[s.id] && <span className="dot" aria-label="Unread" />}
                <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.source === 'managed' && (
                  <>
                    <button className="act" title="Rename" onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }}>✎</button>
                    <button className="act danger" title="Delete" onClick={(e) => { e.stopPropagation(); doDelete(s.id, s.title); }}>🗑</button>
                  </>
                )}
                <span className={`badge ${s.source}`}>{s.source === 'managed' ? 'live' : 'mirror'}</span>
              </span>
            </div>
            <div style={{ color: 'var(--color-fg-dim)', fontSize: 12, marginTop: 4 }}>
              {s.messageCount} messages · {new Date(s.updatedAt).toLocaleString()}
            </div>
          </motion.div>
                ))}
          </div>
        ))}
      </div>
      <style>{`
        .new-btn {
          background: linear-gradient(100deg, var(--color-accent), var(--color-accent-2));
          color: #06060b; border: none; border-radius: 10px; padding: 6px 12px;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .row .act { opacity: 0; background: transparent; border: none; cursor: pointer;
          color: var(--color-fg-dim); font-size: 13px; padding: 2px 4px; border-radius: 6px;
          transition: opacity .15s, background .15s; }
        .row:hover .act, .row:focus-within .act { opacity: 1; }
        .row .act:hover { background: rgba(255,255,255,.08); color: var(--color-fg); }
        .row .act.danger:hover { background: rgba(255,80,80,.16); color: #ff8a8a; }
        .dot { width: 7px; height: 7px; border-radius: 999px; flex: 0 0 auto;
          background: var(--color-accent-2, #2bd4ff); box-shadow: 0 0 8px var(--color-accent-2, #2bd4ff); }
        .ws-header {
          display: flex; align-items: center; justify-content: space-between; gap: 8;
          width: 100%; background: rgba(255,255,255,.03); color: var(--color-fg);
          border: 1px solid var(--color-border); border-radius: 12px;
          padding: 8px 12px; cursor: pointer; text-align: left;
        }
        .ws-name { font-weight: 700; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ws-active { font-size: 10px; padding: 1px 7px; border-radius: 999px;
          background: rgba(54,211,153,.16); color: var(--color-success); }
        .ws-count { font-size: 11px; color: var(--color-fg-dim); background: rgba(255,255,255,.04);
          border-radius: 999px; padding: 1px 8px; }
        .badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; align-self: center; }
        .badge.managed { background: rgba(54,211,153,.16); color: var(--color-success); }
        .badge.mirror { background: rgba(43,212,255,.14); color: var(--color-accent-2); }
      `}</style>
    </div>
  );
}
