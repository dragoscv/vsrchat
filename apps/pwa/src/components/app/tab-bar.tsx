'use client';

import { Reorder, motion, AnimatePresence } from 'motion/react';
import { useVsr } from '@/lib/store';
import { useConnection } from '@/lib/connection';

/**
 * Horizontal, drag-to-reorder tab bar for open sessions. Each tab can be closed;
 * a "+" starts a new chat. The active tab is highlighted with a sliding pill.
 */
export function TabBar() {
  const tabs = useVsr((s) => s.tabs);
  const sessions = useVsr((s) => s.sessions);
  const active = useVsr((s) => s.activeSessionId);
  const unread = useVsr((s) => s.unread);
  const setActive = useVsr((s) => s.setActive);
  const closeTab = useVsr((s) => s.closeTab);
  const reorderTabs = useVsr((s) => s.reorderTabs);
  const { send } = useConnection();

  const title = (id: string) =>
    sessions.find((s) => s.id === id)?.title?.trim() || 'Untitled';

  const onReorder = (next: string[]) => {
    // Translate the new order into a single move so the store stays the source of truth.
    for (let to = 0; to < next.length; to++) {
      const from = tabs.indexOf(next[to]!);
      if (from !== to && from !== -1) {
        reorderTabs(from, to);
        return;
      }
    }
  };

  const open = (id: string) => {
    setActive(id);
    if (!useVsr.getState().details[id]) send({ k: 'session.get', id });
  };

  const newChat = () => send({ k: 'chat.new' });

  if (tabs.length === 0) return null;

  return (
    <div className="tabbar">
      <Reorder.Group axis="x" values={tabs} onReorder={onReorder} className="tabs" as="div">
        <AnimatePresence initial={false}>
          {tabs.map((id) => (
            <Reorder.Item
              key={id}
              value={id}
              as="div"
              layout
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              whileDrag={{ scale: 1.06, zIndex: 5 }}
              className={`tab ${active === id ? 'active' : ''}`}
              onPointerDown={() => open(id)}
            >
              {active === id && (
                <motion.span layoutId="tab-pill" className="pill" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
              )}
              {unread[id] && active !== id && <span className="unread" aria-label="Unread" />}
              <span className="label">{title(id)}</span>
              <button
                className="x"
                aria-label="Close tab"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  closeTab(id);
                }}
              >
                ×
              </button>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <button className="newtab" onClick={newChat} aria-label="New chat">
        +
      </button>

      <style>{`
        .tabbar { display: flex; align-items: center; gap: 6px; padding: 6px 8px;
                  border-bottom: 1px solid var(--color-border); overflow: hidden; }
        .tabs { display: flex; gap: 6px; overflow-x: auto; flex: 1; scrollbar-width: none;
                padding: 2px; }
        .tabs::-webkit-scrollbar { display: none; }
        .tab { position: relative; display: flex; align-items: center; gap: 8px;
               padding: 7px 10px 7px 12px; border-radius: 12px; cursor: grab;
               background: rgba(255,255,255,.03); border: 1px solid var(--color-border);
               white-space: nowrap; user-select: none; flex: 0 0 auto; max-width: 180px; }
        .tab:active { cursor: grabbing; }
        .tab .label { position: relative; z-index: 1; font-size: 13px; overflow: hidden;
                      text-overflow: ellipsis; max-width: 130px; }
        .unread { position: relative; z-index: 1; width: 7px; height: 7px; border-radius: 999px;
            background: var(--color-accent-2, #2bd4ff); box-shadow: 0 0 8px var(--color-accent-2, #2bd4ff);
            flex: 0 0 auto; }
        .tab.active { border-color: var(--color-border-strong); }
        .pill { position: absolute; inset: 0; border-radius: 12px; z-index: 0;
                background: linear-gradient(100deg, rgba(124,92,255,.26), rgba(43,212,255,.18));
                border: 1px solid var(--color-border-strong); }
        .x { position: relative; z-index: 1; background: transparent; border: none;
             color: var(--color-fg-dim); font-size: 16px; line-height: 1; cursor: pointer;
             padding: 0 2px; border-radius: 6px; }
        .x:hover { color: var(--color-fg); background: rgba(255,255,255,.08); }
        .newtab { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 11px;
                  background: rgba(124,92,255,.14); border: 1px solid rgba(124,92,255,.3);
                  color: #c9c4ff; font-size: 20px; cursor: pointer; }
        .newtab:hover { background: rgba(124,92,255,.24); }
      `}</style>
    </div>
  );
}
