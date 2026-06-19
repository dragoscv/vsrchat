import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
      <Link href="/" style={{ color: 'var(--color-fg-muted)', fontSize: 14, textDecoration: 'none' }}>
        ← Home
      </Link>
      <article
        className="glass"
        style={{ borderRadius: 22, padding: '32px 28px', marginTop: 18, lineHeight: 1.7 }}
      >
        {children}
      </article>
      <style>{`
        article h1 { font-size: 26px; margin-top: 0; }
        article h2 { font-size: 18px; margin-top: 28px; color: var(--color-fg); }
        article p, article li { color: var(--color-fg-muted); font-size: 15px; }
        article a { color: var(--color-accent-2); }
        article .updated { color: var(--color-fg-dim); font-size: 13px; }
      `}</style>
    </main>
  );
}
