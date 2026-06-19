'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

const features = [
  { icon: '📜', title: 'All your sessions', desc: 'Mirror your Copilot Chat history, read-only.' },
  { icon: '⚡', title: 'Live streaming', desc: 'Watch responses generate in real time.' },
  { icon: '✍️', title: 'Send from anywhere', desc: 'Continue a chat from your pocket.' },
  { icon: '✅', title: 'Approve tools', desc: 'Allow or deny tool & terminal calls remotely.' },
  { icon: '🔔', title: 'Push alerts', desc: 'Know the moment a response is ready.' },
  { icon: '🔐', title: 'End-to-end encrypted', desc: 'The relay only ever sees ciphertext.' },
];

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 20px 32px',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div
          className="glass"
          style={{
            display: 'inline-flex',
            gap: 8,
            alignItems: 'center',
            padding: '7px 16px',
            borderRadius: 999,
            fontSize: 13,
            color: 'var(--color-fg-muted)',
            marginBottom: 28,
          }}
        >
          🛰️ VS Remote Chat
        </div>
        <h1
          className="gradient-text"
          style={{ fontSize: 'clamp(34px, 8vw, 68px)', lineHeight: 1.05, margin: '0 0 18px', fontWeight: 800 }}
        >
          Your Copilot Chat,
          <br /> in your pocket.
        </h1>
        <p
          style={{
            maxWidth: 540,
            margin: '0 auto 32px',
            color: 'var(--color-fg-muted)',
            fontSize: 'clamp(15px, 4vw, 18px)',
            lineHeight: 1.6,
          }}
        >
          Drive your VS Code Copilot Chat from your phone — view sessions, stream
          responses, send prompts, and approve tools. End-to-end encrypted.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={signedIn ? '/app' : '/login'} className="cta-primary">
            {signedIn ? 'Open the app' : 'Get started'}
          </Link>
          <a href="https://marketplace.visualstudio.com/items?itemName=dragoscv.vsrchat" className="cta-ghost">
            Install the extension
          </a>
        </div>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          maxWidth: 900,
          width: '100%',
          marginTop: 64,
        }}
      >
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className="glass glass-hover"
            style={{ borderRadius: 20, padding: 20, textAlign: 'left' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.06 }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
            <div style={{ color: 'var(--color-fg-muted)', fontSize: 14 }}>{f.desc}</div>
          </motion.div>
        ))}
      </div>

      <style>{`
        .cta-primary {
          background: linear-gradient(100deg, var(--color-accent), var(--color-accent-2));
          color: #06060b; font-weight: 700; border-radius: 14px;
          padding: 13px 26px; font-size: 15px; text-decoration: none;
          box-shadow: 0 12px 40px rgba(124,92,255,.35);
          transition: transform .2s ease;
        }
        .cta-primary:hover { transform: translateY(-2px); }
        .cta-ghost {
          background: rgba(140,130,255,.08); color: var(--color-fg);
          border: 1px solid var(--color-border); border-radius: 14px;
          padding: 13px 26px; font-size: 15px; text-decoration: none;
          transition: border-color .2s ease;
        }
        .cta-ghost:hover { border-color: var(--color-border-strong); }
      `}</style>
    </section>
  );
}
