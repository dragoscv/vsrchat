'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConnectionProvider, useConnection } from '@/lib/connection';
import { SessionList } from './session-list';
import { StatusBar } from './status-bar';
import { ToolApprovals } from './tool-approvals';
import { TabBar } from './tab-bar';
import { SessionDeck } from './session-deck';
import { CommandPalette } from './command-palette';
import { useEffect } from 'react';
import { useVsr } from '@/lib/store';

export function AppShell({ login }: { login: string }) {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  return (
    <ConnectionProvider>
      <ShellInner login={login} mobileView={mobileView} setMobileView={setMobileView} />
    </ConnectionProvider>
  );
}

function ShellInner({
  login,
  mobileView,
  setMobileView,
}: {
  login: string;
  mobileView: 'list' | 'chat';
  setMobileView: (v: 'list' | 'chat') => void;
}) {
  const { paired } = useConnection();
  const { send } = useConnection();

  // Global keyboard shortcuts (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      const { tabs, activeSessionId, setActive, closeTab } = useVsr.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        send({ k: 'chat.new' });
      } else if (!typing && (e.key === '[' || e.key === ']') && activeSessionId) {
        const i = tabs.indexOf(activeSessionId);
        if (i >= 0) {
          const next = e.key === ']' ? Math.min(i + 1, tabs.length - 1) : Math.max(i - 1, 0);
          setActive(tabs[next]);
        }
      } else if (!typing && e.key.toLowerCase() === 'w' && activeSessionId) {
        closeTab(activeSessionId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send]);

  if (!paired) {
    return (
      <div className="empty">
        <div className="card">
          <div className="logo">🛰️</div>
          <h1>Pair this device</h1>
          <p>Open VS Code, run <strong>“VS Remote Chat: Pair a phone”</strong>, and scan the QR with this device’s camera. You’ll land back here, connected — no sign-in needed.</p>
          <Link href="/pair" className="btn">Enter a pairing code manually</Link>
        </div>
        <style>{`
          .empty { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
          .card { max-width: 420px; text-align: center; background: rgba(255,255,255,.03);
                  border: 1px solid rgba(140,130,255,.16); border-radius: 22px; padding: 36px 28px; }
          .logo { font-size: 40px; margin-bottom: 8px; }
          .card h1 { margin: 0 0 10px; font-size: 22px; }
          .card p { color: #a7a7c8; font-size: 14px; line-height: 1.6; }
          .btn { display:inline-block; margin-top: 18px; padding: 10px 18px; border-radius: 12px;
                 background: rgba(124,92,255,.16); border: 1px solid rgba(124,92,255,.34);
                 color: #c9c4ff; text-decoration: none; font-size: 14px; }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="shell">
        <StatusBar login={login} />
        <div className="cols">
          <aside className={`pane list ${mobileView === 'list' ? 'show' : ''}`}>
            <SessionList onOpen={() => setMobileView('chat')} />
          </aside>
          <section className={`pane chat ${mobileView === 'chat' ? 'show' : ''}`}>
            <TabBar />
            <div className="deckwrap">
              <SessionDeck onBack={() => setMobileView('list')} />
            </div>
          </section>
        </div>
        <ToolApprovals />
        <MobileBar mobileView={mobileView} setMobileView={setMobileView} />
        <CommandPalette />
      </div>
      <style>{`
        .shell { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
        .cols { flex: 1; min-height: 0; display: grid;
          grid-template-columns: clamp(280px, 30vw, 380px) 1fr; gap: 14px; padding: 14px; }
        .pane { min-height: 0; min-width: 0; }
        .deckwrap { flex: 1; min-height: 0; }
        .pane.chat { display: flex; flex-direction: column; min-height: 0; min-width: 0;
          border-radius: 18px; overflow: hidden; border: 1px solid var(--color-border);
          background: rgba(255,255,255,.02); }
        @media (max-width: 820px) {
          .cols { grid-template-columns: 1fr; padding: 10px; gap: 10px; }
          .pane { display: none; }
          .pane.list.show { display: block; }
          .pane.chat.show { display: flex; }
        }
      `}</style>
    </>
  );
}

/** Bottom navigation bar — only shown on mobile. */
function MobileBar({
  mobileView,
  setMobileView,
}: {
  mobileView: 'list' | 'chat';
  setMobileView: (v: 'list' | 'chat') => void;
}) {
  const { send } = useConnection();
  const tabs = useVsr((s) => s.tabs);
  const haptic = () => navigator.vibrate?.(8);
  return (
    <nav className="mbar">
      <button className={mobileView === 'list' ? 'on' : ''} onClick={() => { haptic(); setMobileView('list'); }}>
        <span>🗂️</span>Sessions
      </button>
      <button onClick={() => { haptic(); send({ k: 'chat.new' }); setMobileView('chat'); }}>
        <span>＋</span>New
      </button>
      <button className={mobileView === 'chat' ? 'on' : ''} onClick={() => { haptic(); setMobileView('chat'); }} disabled={!tabs.length}>
        <span>💬</span>Chat
      </button>
      <style>{`
        .mbar { display: none; }
        @media (max-width: 820px) {
          .mbar { display: flex; gap: 4px; padding: 6px 10px calc(6px + env(safe-area-inset-bottom));
            border-top: 1px solid var(--color-border); background: var(--color-bg-soft); }
          .mbar button { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
            background: transparent; border: none; color: var(--color-fg-dim); font-size: 11px;
            padding: 6px; border-radius: 10px; cursor: pointer; }
          .mbar button span { font-size: 18px; }
          .mbar button.on { color: var(--color-fg); background: rgba(124,92,255,.14); }
          .mbar button:disabled { opacity: .4; }
        }
      `}</style>
    </nav>
  );
}
