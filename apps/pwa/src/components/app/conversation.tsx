'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useVsr } from '@/lib/store';
import { Composer } from './composer';

export function Conversation({ onBack }: { onBack: () => void }) {
  const activeId = useVsr((s) => s.activeSessionId);
  const detail = useVsr((s) => (activeId ? s.details[activeId] : undefined));
  const pcOnline = useVsr((s) => s.pcOnline);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [detail?.messages]);

  if (!activeId) {
    return (
      <div className="glass" style={emptyStyle}>
        <div style={{ textAlign: 'center', color: 'var(--color-fg-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
          Select a session to start.
        </div>
      </div>
    );
  }

  return (
    <div className="glass" style={{ borderRadius: 18, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} className="back">←</button>
        <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {detail?.title ?? 'Chat'}
        </strong>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gap: 12, alignContent: 'start' }}>
        {detail?.messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bubble ${m.role}`}
          >
            <div className="bubble-role">{m.role}{m.model ? ` · ${m.model}` : ''}</div>
            <div className="bubble-text">
              {m.text}
              {m.pending && <span className="caret">▋</span>}
            </div>
          </motion.div>
        ))}
        {!detail?.messages.length && (
          <p style={{ color: 'var(--color-fg-dim)', fontSize: 13, textAlign: 'center' }}>
            No messages yet — say something below.
          </p>
        )}
      </div>

      <Composer sessionId={activeId} disabled={!pcOnline} />

      <style>{`
        .back { background: transparent; border: none; color: var(--color-fg-muted); font-size: 20px; cursor: pointer; }
        @media (min-width: 821px) { .back { display: none; } }
        .bubble { max-width: 88%; padding: 12px 14px; border-radius: 16px; font-size: 14.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
        .bubble.user { justify-self: end; background: linear-gradient(100deg, rgba(124,92,255,.22), rgba(43,212,255,.16)); border: 1px solid var(--color-border-strong); }
        .bubble.assistant { justify-self: start; background: rgba(255,255,255,.03); border: 1px solid var(--color-border); }
        .bubble.tool, .bubble.system { justify-self: center; background: rgba(251,189,35,.08); border: 1px solid rgba(251,189,35,.2); font-size: 13px; }
        .bubble-role { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-fg-dim); margin-bottom: 4px; }
        .caret { animation: blink 1s steps(2) infinite; color: var(--color-accent-2); }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  borderRadius: 18,
  height: '100%',
  display: 'grid',
  placeItems: 'center',
};
