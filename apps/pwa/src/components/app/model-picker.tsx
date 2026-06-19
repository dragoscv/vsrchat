'use client';

import { useVsr } from '@/lib/store';

export function ModelPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  const models = useVsr((s) => s.models);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="model-picker"
      aria-label="Model"
    >
      <option value="">Default model</option>
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
      <style>{`
        .model-picker {
          background: rgba(255,255,255,.03); color: var(--color-fg-muted);
          border: 1px solid var(--color-border); border-radius: 10px;
          padding: 5px 10px; font-size: 12px; outline: none; max-width: 180px;
        }
      `}</style>
    </select>
  );
}
