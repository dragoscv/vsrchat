'use client';

import { useRef, useState } from 'react';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';
import { ModelPicker } from './model-picker';
import { VoiceButton } from './voice-button';
import type { Attachment } from '@vsrchat/protocol';

export function Composer({ sessionId, disabled }: { sessionId: string; disabled: boolean }) {
  const { send } = useConnection();
  const [text, setText] = useState('');
  const [model, setModel] = useState<string>();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = () => {
    const value = text.trim();
    if (!value && attachments.length === 0) return;
    send({ k: 'prompt.send', sessionId, text: value, model, attachments: attachments.length ? attachments : undefined });
    // Optimistically add the user message locally.
    const detail = useVsr.getState().details[sessionId];
    if (detail) {
      useVsr.getState().setDetail({
        ...detail,
        messages: [
          ...detail.messages,
          {
            id: `local-${Date.now()}`,
            role: 'user',
            text: value,
            createdAt: Date.now(),
            files: attachments.map((a) => ({ name: a.name, path: a.name })),
          },
        ],
      });
    }
    setText('');
    setAttachments([]);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const f of Array.from(files).slice(0, 5)) {
      if (f.size > 1_000_000) continue; // 1 MB cap per file
      const data = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
        r.readAsDataURL(f);
      });
      next.push({ name: f.name, mime: f.type || 'application/octet-stream', data });
    }
    setAttachments((prev) => [...prev, ...next]);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div style={{ padding: 12, borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <ModelPicker value={model} onChange={setModel} />
        <span style={{ flex: 1 }} />
        {disabled && <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>PC offline</span>}
      </div>
      {attachments.length > 0 && (
        <div className="attach-row">
          {attachments.map((a, i) => (
            <span key={i} className="attach">
              📎 {a.name}
              <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} aria-label="Remove">×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
        <button className="attach-btn" onClick={() => fileInput.current?.click()} disabled={disabled} aria-label="Attach files">📎</button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? 'Waiting for your PC…' : 'Message Copilot…'}
          rows={1}
          className="composer-input"
        />
        <VoiceButton onTranscript={(t) => setText((prev) => (prev ? prev + ' ' : '') + t)} />
        <button onClick={submit} disabled={disabled || !text.trim()} className="send-btn" aria-label="Send">
          ↑
        </button>
      </div>
      <style>{`
        .composer-input {
          flex: 1; resize: none; max-height: 140px; min-height: 44px;
          background: rgba(255,255,255,.03); color: var(--color-fg);
          border: 1px solid var(--color-border); border-radius: 14px;
          padding: 12px 14px; font-size: 15px; font-family: inherit; outline: none;
        }
        .composer-input:focus { border-color: var(--color-border-strong); }
        .send-btn {
          width: 44px; height: 44px; border-radius: 14px; border: none; cursor: pointer;
          background: linear-gradient(100deg, var(--color-accent), var(--color-accent-2));
          color: #06060b; font-size: 20px; font-weight: 700;
          transition: transform .15s ease, opacity .15s ease;
        }
        .send-btn:disabled { opacity: .4; cursor: not-allowed; }
        .send-btn:not(:disabled):active { transform: scale(.94); }
        .attach-btn { width: 44px; height: 44px; border-radius: 14px; cursor: pointer;
          background: rgba(255,255,255,.04); border: 1px solid var(--color-border);
          color: var(--color-fg-muted); font-size: 18px; }
        .attach-btn:disabled { opacity: .4; cursor: not-allowed; }
        .attach-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .attach { display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
          padding: 4px 9px; border-radius: 9px; background: rgba(124,92,255,.12);
          border: 1px solid rgba(124,92,255,.3); color: #c9c4ff; }
        .attach button { background: transparent; border: none; color: inherit; cursor: pointer;
          font-size: 15px; line-height: 1; }
      `}</style>
    </div>
  );
}
