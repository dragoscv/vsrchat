'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';

/** Read-only file references attached to a message; tap to view content. */
export function FileChips({ files }: { files: { name: string; path: string }[] }) {
  const { send } = useConnection();
  const fileMap = useVsr((s) => s.files);
  const [openPath, setOpenPath] = useState<string | null>(null);

  const view = (path: string) => {
    setOpenPath(path);
    if (!fileMap[path]) send({ k: 'file.get', path });
  };

  const open = openPath ? fileMap[openPath] : undefined;

  return (
    <div className="chips">
      {files.map((f) => (
        <button key={f.path} className="chip" onClick={() => view(f.path)} title={f.path}>
          📄 {f.name}
        </button>
      ))}

      <AnimatePresence>
        {openPath && (
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenPath(null)}
          >
            <motion.div
              className="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-head">
                <strong>{open?.name ?? openPath.split(/[\\/]/).pop()}</strong>
                <button onClick={() => setOpenPath(null)} aria-label="Close">×</button>
              </div>
              <pre className="sheet-body">
                {open?.error
                  ? `⚠️ ${open.error}`
                  : open?.text ?? 'Loading…'}
                {open?.truncated ? '\n\n… (truncated)' : ''}
              </pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .chip { font-size: 12px; padding: 4px 9px; border-radius: 9px; cursor: pointer;
                background: rgba(43,212,255,.1); border: 1px solid rgba(43,212,255,.28);
                color: #aee9ff; max-width: 200px; overflow: hidden; text-overflow: ellipsis;
                white-space: nowrap; }
        .chip:hover { background: rgba(43,212,255,.2); }
        .sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 40;
                          display: flex; align-items: flex-end; backdrop-filter: blur(2px); }
        .sheet { width: 100%; max-height: 80dvh; background: var(--color-bg-elevated, #14141c);
                 border-top-left-radius: 18px; border-top-right-radius: 18px;
                 border: 1px solid var(--color-border); display: flex; flex-direction: column; }
        .sheet-head { display: flex; justify-content: space-between; align-items: center;
                      padding: 14px 16px; border-bottom: 1px solid var(--color-border); }
        .sheet-head button { background: transparent; border: none; color: var(--color-fg-muted);
                             font-size: 22px; cursor: pointer; }
        .sheet-body { margin: 0; padding: 16px; overflow: auto; font-size: 12.5px; line-height: 1.5;
                      font-family: ui-monospace, "SF Mono", Menlo, monospace; white-space: pre-wrap;
                      word-break: break-word; }
      `}</style>
    </div>
  );
}
