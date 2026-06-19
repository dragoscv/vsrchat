'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const KEY = 'vsrchat.consent.v1';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  decidedAt: number;
}

export function getConsent(): ConsentState | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function save(analytics: boolean): void {
  const state: ConsentState = { necessary: true, analytics, decidedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** GDPR cookie consent banner with working per-category preferences. */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (!getConsent()) setOpen(true);
  }, []);

  if (!open) return null;

  const acceptAll = () => {
    save(true);
    setOpen(false);
  };
  const rejectAll = () => {
    save(false);
    setOpen(false);
  };
  const savePrefs = () => {
    save(analytics);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="glass"
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 80,
            borderRadius: 20,
            padding: 18,
            maxWidth: 520,
            margin: '0 auto',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-fg)' }}>
            🍪 We use only essential cookies to keep you signed in. Optional analytics
            help us improve the app. You choose.
          </p>

          {prefs && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-fg-muted)' }}>
                <span>Necessary (always on)</span>
                <input type="checkbox" checked readOnly />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-fg-muted)' }}>
                <span>Analytics</span>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={acceptAll} className="btn-accent">
              Accept all
            </button>
            <button onClick={rejectAll} className="btn-ghost">
              Reject all
            </button>
            <button onClick={() => (prefs ? savePrefs() : setPrefs(true))} className="btn-ghost">
              {prefs ? 'Save preferences' : 'Preferences'}
            </button>
          </div>

          <style>{`
            .btn-accent {
              background: linear-gradient(100deg, var(--color-accent), var(--color-accent-2));
              color: #06060b; font-weight: 600; border: none; border-radius: 12px;
              padding: 9px 16px; font-size: 13px; cursor: pointer;
            }
            .btn-ghost {
              background: rgba(140,130,255,.1); color: var(--color-fg);
              border: 1px solid var(--color-border); border-radius: 12px;
              padding: 9px 16px; font-size: 13px; cursor: pointer;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
