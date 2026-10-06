'use client';

/** Dark shimmer skeleton rows for the session list. */
export function SessionListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 10px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sk-row">
          <div className="skeleton" style={{ height: 14, width: `${60 + ((i * 13) % 30)}%` }} />
          <div className="skeleton" style={{ height: 10, width: `${35 + ((i * 7) % 25)}%`, marginTop: 8 }} />
          <style>{`
            .sk-row { padding: 12px; border-radius: 14px; border: 1px solid var(--color-border);
                      background: rgba(255,255,255,.015); }
          `}</style>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the conversation message area. */
export function ConversationSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16 }}>
      {[72, 120, 56, 96].map((h, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: h,
            width: i % 2 ? '70%' : '85%',
            alignSelf: i % 2 ? 'flex-end' : 'flex-start',
            borderRadius: 16,
          }}
        />
      ))}
    </div>
  );
}
