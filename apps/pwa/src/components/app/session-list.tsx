'use client';

import { motion } from 'motion/react';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';

export function SessionList({ onOpen }: { onOpen: () => void }) {
  const { send } = useConnection();
  const sessions = useVsr((s) => s.sessions);
  const setActive = useVsr((s) => s.setActive);
  const active = useVsr((s) => s.activeSessionId);

  const openSession = (id: string) => {
    setActive(id);
    send({ k: 'session.get', id });
    onOpen();
  };

  const newChat = () => {
    send({ k: 'chat.new' });
  };

  return (
    <div className="glass" style={{ borderRadius: 18, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 14 }}>Sessions</strong>
        <button onClick={newChat} className="new-btn">＋ New</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '0 10px 10px', display: 'grid', gap: 8 }}>
        {sessions.length === 0 && (
          <p style={{ color: 'var(--color-fg-dim)', fontSize: 13, padding: 12, textAlign: 'center' }}>
            No sessions yet. Start a new chat or wait for your PC to sync.
          </p>
        )}
        {sessions.map((s, i) => (
          <motion.button
            key={s.id}
            onClick={() => openSession(s.id)}
            className="glass-hover"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            style={{
              textAlign: 'left',
              background: active === s.id ? 'rgba(124,92,255,.14)' : 'rgba(255,255,255,.02)',
              border: `1px solid ${active === s.id ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
              borderRadius: 14,
              padding: 12,
              cursor: 'pointer',
              color: 'var(--color-fg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title}
              </span>
              <span className={`badge ${s.source}`}>{s.source === 'managed' ? 'live' : 'mirror'}</span>
            </div>
            <div style={{ color: 'var(--color-fg-dim)', fontSize: 12, marginTop: 4 }}>
              {s.messageCount} messages · {new Date(s.updatedAt).toLocaleString()}
            </div>
          </motion.button>
        ))}
      </div>
      <style>{`
        .new-btn {
          background: linear-gradient(100deg, var(--color-accent), var(--color-accent-2));
          color: #06060b; border: none; border-radius: 10px; padding: 6px 12px;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; align-self: center; }
        .badge.managed { background: rgba(54,211,153,.16); color: var(--color-success); }
        .badge.mirror { background: rgba(43,212,255,.14); color: var(--color-accent-2); }
      `}</style>
    </div>
  );
}
