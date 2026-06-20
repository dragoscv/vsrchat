'use client';

import Link from 'next/link';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';

export function StatusBar({ login }: { login: string }) {
  const { reconnect } = useConnection();
  const status = useVsr((s) => s.status);
  const pcOnline = useVsr((s) => s.pcOnline);
  const pcInfo = useVsr((s) => s.pcInfo);
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

  const label = pcOnline ? 'PC online' : status === 'online' ? 'Waiting for PC…' : 'Connecting…';
  const color = pcOnline ? 'var(--color-success)' : status === 'online' ? 'var(--color-warning)' : 'var(--color-fg-dim)';

  return (
    <header
      className="glass"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        margin: 14,
        marginBottom: 0,
        borderRadius: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🛰️</span>
        <strong style={{ fontSize: 14 }}>VS Remote Chat</strong>
        <button
          onClick={reconnect}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
          {label}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {pcInfo && (
          <span className="ver" title={`VS Code ${pcInfo.vscodeVersion} · extension ${pcInfo.extVersion}`}>
            ext v{pcInfo.extVersion}
          </span>
        )}
        <span className="ver app" title="Web app version">web v{appVersion}</span>
        <Link href="/account" style={{ color: 'var(--color-fg-muted)', fontSize: 13, textDecoration: 'none' }}>
          @{login}
        </Link>
      </div>
      <style>{`
        .ver { font-size: 11px; color: var(--color-fg-dim); padding: 3px 8px; border-radius: 999px;
               background: rgba(255,255,255,.04); border: 1px solid var(--color-border);
               font-variant-numeric: tabular-nums; white-space: nowrap; }
        .ver.app { color: #bdb8ff; border-color: rgba(124,92,255,.3); background: rgba(124,92,255,.1); }
      `}</style>
    </header>
  );
}
