'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Voice-to-prompt using the Web Speech API (SpeechRecognition).
 * Available in Chrome/Android; gracefully degrades elsewhere.
 */
export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);

  const toggle = () => {
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) {
      toast.error('Voice input is not supported on this device.');
      return;
    }
    if (listening) {
      (recRef.current as { stop: () => void } | null)?.stop();
      return;
    }
    const rec = new (SR as new () => {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    })();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const transcript = last?.[0]?.transcript ?? '';
      if (transcript) onTranscript(transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <button onClick={toggle} className="voice-btn" aria-label="Voice input" data-on={listening}>
      🎙️
      <style>{`
        .voice-btn {
          width: 44px; height: 44px; border-radius: 14px; cursor: pointer;
          background: rgba(255,255,255,.03); border: 1px solid var(--color-border);
          font-size: 18px; transition: all .2s ease;
        }
        .voice-btn[data-on="true"] {
          background: rgba(248,114,114,.18); border-color: var(--color-danger);
          animation: pulse 1.2s ease-in-out infinite;
        }
        @keyframes pulse { 50% { box-shadow: 0 0 0 6px rgba(248,114,114,.12); } }
      `}</style>
    </button>
  );
}
