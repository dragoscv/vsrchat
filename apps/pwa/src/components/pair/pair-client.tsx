'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { PairingPayloadSchema } from '@vsrchat/protocol';
import { createPairingFromPayload, decodePairingHash, savePairing } from '@/lib/pairing-store';

export function PairClient() {
  const router = useRouter();
  const [status, setStatus] = useState<'reading' | 'manual' | 'done'>('reading');
  const [login, setLogin] = useState<string>();

  useEffect(() => {
    const payload = decodePairingHash(window.location.hash);
    if (!payload) {
      setStatus('manual');
      return;
    }
    const parsed = PairingPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error('Invalid pairing data.');
      setStatus('manual');
      return;
    }
    if (parsed.data.exp < Date.now()) {
      toast.error('This pairing code has expired. Generate a new one in VS Code.');
      setStatus('manual');
      return;
    }
    const pairing = createPairingFromPayload(parsed.data);
    savePairing(pairing);
    setLogin(parsed.data.login);
    setStatus('done');
    toast.success('Paired! Connecting…');
    setTimeout(() => router.replace('/app'), 1200);
  }, [router]);

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <motion.div
        className="glass"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ borderRadius: 24, padding: 36, width: 'min(420px, 92vw)', textAlign: 'center' }}
      >
        {status === 'done' ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>Paired{login ? ` as ${login}` : ''}</h1>
            <p style={{ color: 'var(--color-fg-muted)', fontSize: 14 }}>Opening your sessions…</p>
          </>
        ) : status === 'reading' ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🛰️</div>
            <h1 style={{ fontSize: 20 }}>Pairing…</h1>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>Scan the QR in VS Code</h1>
            <p style={{ color: 'var(--color-fg-muted)', fontSize: 14, marginBottom: 18 }}>
              In VS Code run <strong>“VS Remote Chat: Pair a phone…”</strong> and scan the QR
              with your camera, or open the link it shows.
            </p>
            <ManualCode />
          </>
        )}
      </motion.div>
    </main>
  );
}

function ManualCode() {
  // Camera-less fallback: the user opens the deep link from VS Code which carries
  // the payload in the hash. A pure 8-char code path requires a PAKE exchange via
  // the relay; that flow is documented in docs/security.md.
  return (
    <p style={{ color: 'var(--color-fg-dim)', fontSize: 12 }}>
      No camera? Open the pairing link shown in VS Code directly on this device.
    </p>
  );
}
