'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useVsr } from '@/lib/store';
import { useConnection } from '@/lib/connection';
import { Conversation } from './conversation';

/**
 * Swipeable pager over the open session tabs. Swiping left/right anywhere on the
 * screen switches to the adjacent tab; the active conversation slides in.
 */
export function SessionDeck({ onBack }: { onBack: () => void }) {
  const tabs = useVsr((s) => s.tabs);
  const active = useVsr((s) => s.activeSessionId);
  const setActive = useVsr((s) => s.setActive);
  const { send } = useConnection();

  const index = active ? tabs.indexOf(active) : -1;

  // Fetch detail for the active tab if we don't have it yet.
  useEffect(() => {
    if (active && !useVsr.getState().details[active]) send({ k: 'session.get', id: active });
  }, [active, send]);

  const go = (dir: -1 | 1) => {
    if (index < 0) return;
    const next = index + dir;
    if (next < 0 || next >= tabs.length) return;
    setActive(tabs[next]!);
  };

  if (!active || index < 0) {
    return (
      <div className="deck-empty">
        <p>Pick a session, or start a new chat.</p>
        <style>{`.deck-empty { height: 100%; display: grid; place-items: center; color: var(--color-fg-dim); }`}</style>
      </div>
    );
  }

  return (
    <div className="deck">
      {/* Position dots */}
      {tabs.length > 1 && (
        <div className="dots">
          {tabs.map((id, i) => (
            <span key={id} className={`dot ${i === index ? 'on' : ''}`} />
          ))}
        </div>
      )}

      <AnimatePresence initial={false} mode="popLayout" custom={index}>
        <motion.div
          key={active}
          className="page"
          custom={index}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_e, info) => {
            if (info.offset.x < -80 || info.velocity.x < -500) go(1);
            else if (info.offset.x > 80 || info.velocity.x > 500) go(-1);
          }}
        >
          <Conversation onBack={onBack} />
        </motion.div>
      </AnimatePresence>

      <style>{`
        .deck { position: relative; height: 100%; overflow: hidden; }
        .page { height: 100%; touch-action: pan-y; }
        .dots { position: absolute; top: 6px; left: 0; right: 0; z-index: 3;
                display: flex; gap: 5px; justify-content: center; pointer-events: none; }
        .dot { width: 6px; height: 6px; border-radius: 999px; background: var(--color-border-strong);
               transition: all .2s; }
        .dot.on { width: 18px; background: var(--color-accent-2); }
      `}</style>
    </div>
  );
}
