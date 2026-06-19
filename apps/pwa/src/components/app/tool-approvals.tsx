'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';

/** Floating cards for pending tool/terminal calls that need remote approval. */
export function ToolApprovals() {
  const { send } = useConnection();
  const tools = useVsr((s) => s.pendingTools);
  const resolve = useVsr((s) => s.resolveTool);

  return (
    <div style={{ position: 'fixed', right: 14, bottom: 14, zIndex: 70, display: 'grid', gap: 10, maxWidth: 360 }}>
      <AnimatePresence>
        {tools.map((t) => (
          <motion.div
            key={t.id}
            className="glass"
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            style={{ borderRadius: 16, padding: 14 }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-warning)' }}>
              {t.kind} request
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, margin: '4px 0' }}>{t.name}</div>
            <pre className="preview">{t.preview}</pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                className="approve"
                onClick={() => {
                  send({ k: 'tool.approve', id: t.id });
                  resolve(t.id);
                }}
              >
                Approve
              </button>
              <button
                className="deny"
                onClick={() => {
                  send({ k: 'tool.deny', id: t.id });
                  resolve(t.id);
                }}
              >
                Deny
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <style>{`
        .preview {
          margin: 0; font-family: var(--font-mono); font-size: 12px;
          background: rgba(0,0,0,.3); border-radius: 10px; padding: 8px 10px;
          color: var(--color-fg-muted); max-height: 100px; overflow: auto; white-space: pre-wrap;
        }
        .approve { flex: 1; background: rgba(54,211,153,.18); color: var(--color-success);
          border: 1px solid rgba(54,211,153,.35); border-radius: 10px; padding: 8px; font-weight: 600; cursor: pointer; }
        .deny { flex: 1; background: rgba(248,114,114,.14); color: var(--color-danger);
          border: 1px solid rgba(248,114,114,.32); border-radius: 10px; padding: 8px; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
}
