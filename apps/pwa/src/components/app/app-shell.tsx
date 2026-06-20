'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConnectionProvider, useConnection } from '@/lib/connection';
import { SessionList } from './session-list';
import { Conversation } from './conversation';
import { StatusBar } from './status-bar';
import { ToolApprovals } from './tool-approvals';

export function AppShell({ authToken, login }: { authToken?: string; login: string }) {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  return (
    <ConnectionProvider authToken={authToken}>
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
            <Conversation onBack={() => setMobileView('list')} />
          </section>
        </div>
        <ToolApprovals />
      </div>
      <style>{`
        .shell { min-height: 100dvh; display: flex; flex-direction: column; }
        .cols { flex: 1; display: grid; grid-template-columns: 340px 1fr; gap: 14px; padding: 14px; min-height: 0; }
        .pane { min-height: 0; }
        @media (max-width: 820px) {
          .cols { grid-template-columns: 1fr; }
          .pane { display: none; }
          .pane.show { display: block; }
        }
      `}</style>
    </>
  );
}
