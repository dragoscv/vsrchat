export const metadata = { title: 'Offline · VS Remote Chat' };

export default function OfflinePage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div className="glass" style={{ borderRadius: 22, padding: 36, maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
        <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>You’re offline</h1>
        <p style={{ color: 'var(--color-fg-muted)', fontSize: 14 }}>
          Your cached sessions are still available once you reconnect.
        </p>
      </div>
    </main>
  );
}
