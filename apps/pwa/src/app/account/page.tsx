import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { AccountClient } from '@/components/account/account-client';

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/account');

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <Link href="/app" style={{ color: 'var(--color-fg-muted)', fontSize: 14, textDecoration: 'none' }}>
        ← Back to app
      </Link>
      <h1 style={{ marginTop: 16 }}>Account</h1>

      <section className="glass" style={{ borderRadius: 18, padding: 20, marginTop: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Signed in as</h2>
        <p style={{ color: 'var(--color-fg-muted)' }}>
          {session.user?.name ?? session.ghLogin} (@{session.ghLogin})
        </p>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button type="submit" className="danger">Sign out</button>
        </form>
      </section>

      <AccountClient />

      <section className="glass" style={{ borderRadius: 18, padding: 20, marginTop: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Legal</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <Link href="/legal/terms" style={linkStyle}>Terms of Service</Link>
          <Link href="/legal/privacy" style={linkStyle}>Privacy Policy</Link>
          <Link href="/legal/cookies" style={linkStyle}>Cookies Policy</Link>
        </div>
      </section>

      <style>{`
        .danger { background: rgba(248,114,114,.14); color: var(--color-danger);
          border: 1px solid rgba(248,114,114,.32); border-radius: 12px; padding: 10px 18px;
          font-weight: 600; cursor: pointer; }
      `}</style>
    </main>
  );
}

const linkStyle: React.CSSProperties = { color: 'var(--color-accent-2)', textDecoration: 'none', fontSize: 14 };
