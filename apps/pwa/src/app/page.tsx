import Link from 'next/link';
import { auth } from '@/auth';
import { Hero } from '@/components/landing/hero';

export default async function Home() {
  const session = await auth();
  return (
    <main>
      <Hero signedIn={!!session} />
      <footer
        style={{
          textAlign: 'center',
          padding: '40px 16px',
          color: 'var(--color-fg-dim)',
          fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <Link href="/legal/terms" style={{ color: 'var(--color-fg-muted)' }}>Terms</Link>
          <Link href="/legal/privacy" style={{ color: 'var(--color-fg-muted)' }}>Privacy</Link>
          <Link href="/legal/cookies" style={{ color: 'var(--color-fg-muted)' }}>Cookies</Link>
          <a href="https://github.com/dragoscv/vsrchat" style={{ color: 'var(--color-fg-muted)' }}>GitHub</a>
        </div>
        © {new Date().getFullYear()} VS Remote Chat · Built by{' '}
        <a href="https://dragoscatalin.ro" style={{ color: 'var(--color-accent-2)' }}>
          Dragoș Cătălin
        </a>
      </footer>
    </main>
  );
}
