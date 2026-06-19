'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { clearPairing, loadPairing } from '@/lib/pairing-store';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push';

export function AccountClient() {
  const [paired, setPaired] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    setPaired(!!loadPairing());
    setPushOn(typeof Notification !== 'undefined' && Notification.permission === 'granted');
    try {
      const raw = localStorage.getItem('vsrchat.consent.v1');
      if (raw) setAnalytics(!!JSON.parse(raw).analytics);
    } catch {
      /* ignore */
    }
  }, []);

  const unpair = () => {
    clearPairing();
    setPaired(false);
    toast.success('This device has been unpaired.');
  };

  const togglePush = async () => {
    if (pushOn) {
      await unsubscribeFromPush();
      setPushOn(false);
      toast('Push notifications disabled.');
    } else {
      const ok = await subscribeToPush();
      setPushOn(ok);
      toast[ok ? 'success' : 'error'](ok ? 'Push notifications enabled.' : 'Could not enable push.');
    }
  };

  const toggleAnalytics = (v: boolean) => {
    setAnalytics(v);
    localStorage.setItem(
      'vsrchat.consent.v1',
      JSON.stringify({ necessary: true, analytics: v, decidedAt: Date.now() }),
    );
  };

  return (
    <>
      <section className="glass" style={{ borderRadius: 18, padding: 20, marginTop: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Pairing</h2>
        <p style={{ color: 'var(--color-fg-muted)', fontSize: 14 }}>
          {paired ? 'This device is paired with your PC.' : 'This device is not paired.'}
        </p>
        {paired && (
          <button onClick={unpair} className="ghost">Unpair this device</button>
        )}
      </section>

      <section className="glass" style={{ borderRadius: 18, padding: 20, marginTop: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Notifications & privacy</h2>
        <label style={rowStyle}>
          <span>Push notifications</span>
          <input type="checkbox" checked={pushOn} onChange={togglePush} />
        </label>
        <label style={rowStyle}>
          <span>Anonymous analytics</span>
          <input type="checkbox" checked={analytics} onChange={(e) => toggleAnalytics(e.target.checked)} />
        </label>
      </section>
      <style>{`
        .ghost { background: rgba(140,130,255,.1); color: var(--color-fg);
          border: 1px solid var(--color-border); border-radius: 12px; padding: 9px 16px; cursor: pointer; }
      `}</style>
    </>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  fontSize: 14,
  color: 'var(--color-fg-muted)',
};
