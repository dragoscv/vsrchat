'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useVsr } from '@/lib/store';
import { useConnection } from '@/lib/connection';

/**
 * Cmd/Ctrl+K command palette: quick-switch sessions and run actions.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const sessions = useVsr((s) => s.sessions);
  const openTab = useVsr((s) => s.openTab);
  const { send } = useConnection();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQ('');
        setIdx(0);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  type Item = { id: string; label: string; hint?: string; run: () => void };
  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      { id: 'new', label: '＋ New chat', hint: 'action', run: () => send({ k: 'chat.new' }) },
    ];
    const ql = q.trim().toLowerCase();
    const sess = sessions
      .filter((s) => !ql || s.title.toLowerCase().includes(ql))
      .slice(0, 8)
      .map((s) => ({
        id: s.id,
        label: s.title || 'Untitled',
        hint: s.workspace,
        run: () => {
          openTab(s.id);
          if (!useVsr.getState().details[s.id]) {
            useVsr.getState().setLoadingDetail(s.id, true);
            send({ k: 'session.get', id: s.id });
          }
        },
      }));
    return [...base, ...sess];
  }, [q, sessions, send, openTab]);

  const run = (i: number) => {
    items[i]?.run();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="cp"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setIdx(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); run(idx); }
              }}
              placeholder="Search sessions or run a command…"
              aria-label="Command palette"
            />
            <div className="cp-list">
              {items.map((it, i) => (
                <button key={it.id} className={`cp-item ${i === idx ? 'on' : ''}`} onClick={() => run(i)} onMouseEnter={() => setIdx(i)}>
                  <span className="truncate-1">{it.label}</span>
                  {it.hint && <span className="cp-hint truncate-1">{it.hint}</span>}
                </button>
              ))}
              {items.length === 0 && <div className="cp-empty">No matches</div>}
            </div>
          </motion.div>

          <style>{`
            .cp-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.5);
              backdrop-filter: blur(3px); display: flex; align-items: flex-start; justify-content: center;
              padding-top: 12vh; }
            .cp { width: min(560px, 92vw); background: var(--color-surface-solid);
              border: 1px solid var(--color-border-strong); border-radius: 16px; overflow: hidden;
              box-shadow: 0 30px 80px rgba(0,0,0,.6); }
            .cp input { width: 100%; padding: 16px 18px; border: none; outline: none; font-size: 15px;
              background: transparent; color: var(--color-fg); border-bottom: 1px solid var(--color-border); }
            .cp-list { max-height: 50vh; overflow-y: auto; padding: 6px; }
            .cp-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
              padding: 10px 12px; border-radius: 10px; border: none; background: transparent;
              color: var(--color-fg); cursor: pointer; font-size: 14px; }
            .cp-item.on { background: rgba(124,92,255,.18); }
            .cp-hint { margin-left: auto; font-size: 11px; color: var(--color-fg-dim); max-width: 40%; }
            .cp-empty { padding: 20px; text-align: center; color: var(--color-fg-dim); font-size: 13px; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
