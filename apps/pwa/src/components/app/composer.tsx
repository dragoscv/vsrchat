'use client';

import { useState } from 'react';
import { useConnection } from '@/lib/connection';
import { useVsr } from '@/lib/store';
import { ModelPicker } from './model-picker';
import { VoiceButton } from './voice-button';

export function Composer({ sessionId, disabled }: { sessionId: string; disabled: boolean }) {
  const { send } = useConnection();
  const [text, setText] = useState('');
  const [model, setModel] = useState<string>();

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    send({ k: 'prompt.send', sessionId, text: value, model });
    // Optimistically add the user message locally.
    const detail = useVsr.getState().details[sessionId];
    if (detail) {
      useVsr.getState().setDetail({
        ...detail,
        messages: [
          ...detail.messages,
          { id: `local-${Date.now()}`, role: 'user', text: value, createdAt: Date.now() },
        ],
      });
    }
    setText('');
  };

  return (
    <div style={{ padding: 12, borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <ModelPicker value={model} onChange={setModel} />
        <span style={{ flex: 1 }} />
        {disabled && <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>PC offline</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
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
      `}</style>
    </div>
  );
}
