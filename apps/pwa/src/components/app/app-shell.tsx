'use client';

import { useState } from 'react';
import { ConnectionProvider } from '@/lib/connection';
import { SessionList } from './session-list';
import { Conversation } from './conversation';
import { StatusBar } from './status-bar';
import { ToolApprovals } from './tool-approvals';

export function AppShell({ authToken, login }: { authToken: string; login: string }) {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  return (
    <ConnectionProvider authToken={authToken}>
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
    </ConnectionProvider>
  );
}
