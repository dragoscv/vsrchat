'use client';

import { create } from 'zustand';
import type {
  AgentInfo,
  ChatMessage,
  ModelInfo,
  SessionDetail,
  SessionSummary,
  ToolCall,
} from '@vsrchat/protocol';
import type { RelayStatus } from './relay-client';

interface VsrState {
  status: RelayStatus | 'idle';
  pcOnline: boolean;
  sessions: SessionSummary[];
  details: Record<string, SessionDetail>;
  models: ModelInfo[];
  agents: AgentInfo[];
  pendingTools: ToolCall[];
  activeSessionId?: string;

  setStatus: (s: RelayStatus | 'idle') => void;
  setPcOnline: (online: boolean) => void;
  setSessions: (s: SessionSummary[]) => void;
  setDetail: (d: SessionDetail) => void;
  setModels: (m: ModelInfo[]) => void;
  setAgents: (a: AgentInfo[]) => void;
  addTool: (t: ToolCall) => void;
  resolveTool: (id: string) => void;
  setActive: (id?: string) => void;
  appendDelta: (sessionId: string, messageId: string, chunk: string, done?: boolean, model?: string) => void;
}

export const useVsr = create<VsrState>((set) => ({
  status: 'idle',
  pcOnline: false,
  sessions: [],
  details: {},
  models: [],
  agents: [],
  pendingTools: [],

  setStatus: (status) => set({ status }),
  setPcOnline: (pcOnline) => set({ pcOnline }),
  setSessions: (sessions) => set({ sessions }),
  setDetail: (d) => set((s) => ({ details: { ...s.details, [d.id]: d } })),
  setModels: (models) => set({ models }),
  setAgents: (agents) => set({ agents }),
  addTool: (t) => set((s) => ({ pendingTools: [...s.pendingTools, t] })),
  resolveTool: (id) => set((s) => ({ pendingTools: s.pendingTools.filter((t) => t.id !== id) })),
  setActive: (activeSessionId) => set({ activeSessionId }),

  appendDelta: (sessionId, messageId, chunk, done, model) =>
    set((s) => {
      const detail = s.details[sessionId];
      if (!detail) return s;
      const messages = [...detail.messages];
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx >= 0) {
        const existing = messages[idx]!;
        messages[idx] = {
          ...existing,
          text: existing.text + chunk,
          pending: !done,
          model: model ?? existing.model,
        };
      } else {
        const msg: ChatMessage = {
          id: messageId,
          role: 'assistant',
          text: chunk,
          createdAt: Date.now(),
          pending: !done,
          model,
        };
        messages.push(msg);
      }
      return {
        details: {
          ...s.details,
          [sessionId]: { ...detail, messages, updatedAt: Date.now() },
        },
      };
    }),
}));
