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
  /** Ordered list of open session tabs (session ids). */
  tabs: string[];
  /** Fetched file contents, keyed by path. */
  files: Record<string, { name: string; text?: string; truncated?: boolean; error?: string }>;
  /** Info about the connected extension/PC (from its hello). */
  pcInfo?: { machine: string; vscodeVersion: string; extVersion: string };
  /** Session ids with unread activity (delta arrived while not active). */
  unread: Record<string, boolean>;

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
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  reorderTabs: (from: number, to: number) => void;
  setFile: (path: string, file: { name: string; text?: string; truncated?: boolean; error?: string }) => void;
  setPcInfo: (info: { machine: string; vscodeVersion: string; extVersion: string }) => void;
  removeSession: (id: string) => void;
  clearUnread: (id: string) => void;
}

export const useVsr = create<VsrState>((set) => ({
  status: 'idle',
  pcOnline: false,
  sessions: [],
  details: {},
  models: [],
  agents: [],
  pendingTools: [],
  tabs: [],
  files: {},
  unread: {},

  setStatus: (status) => set({ status }),
  setPcOnline: (pcOnline) => set({ pcOnline }),
  setSessions: (sessions) => set({ sessions }),
  setDetail: (d) => set((s) => ({ details: { ...s.details, [d.id]: d } })),
  setModels: (models) => set({ models }),
  setAgents: (agents) => set({ agents }),
  addTool: (t) => set((s) => ({ pendingTools: [...s.pendingTools, t] })),
  resolveTool: (id) => set((s) => ({ pendingTools: s.pendingTools.filter((t) => t.id !== id) })),
  setActive: (activeSessionId) =>
    set((s) => {
      if (!activeSessionId) return { activeSessionId };
      // Ensure the active session has a tab.
      const tabs = s.tabs.includes(activeSessionId) ? s.tabs : [...s.tabs, activeSessionId];
      const unread = { ...s.unread };
      delete unread[activeSessionId];
      return { activeSessionId, tabs, unread };
    }),

  openTab: (id) =>
    set((s) => ({
      tabs: s.tabs.includes(id) ? s.tabs : [...s.tabs, id],
      activeSessionId: id,
    })),

  closeTab: (id) =>
    set((s) => {
      const idx = s.tabs.indexOf(id);
      const tabs = s.tabs.filter((t) => t !== id);
      let activeSessionId = s.activeSessionId;
      if (activeSessionId === id) {
        const next = tabs[Math.min(idx, tabs.length - 1)];
        activeSessionId = next;
      }
      return { tabs, activeSessionId };
    }),

  reorderTabs: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || to < 0 || from >= s.tabs.length || to >= s.tabs.length) return s;
      const tabs = [...s.tabs];
      const [moved] = tabs.splice(from, 1);
      tabs.splice(to, 0, moved!);
      return { tabs };
    }),

  setFile: (path, file) => set((s) => ({ files: { ...s.files, [path]: file } })),

  setPcInfo: (pcInfo) => set({ pcInfo }),

  removeSession: (id) =>
    set((s) => {
      const details = { ...s.details };
      delete details[id];
      const unread = { ...s.unread };
      delete unread[id];
      const idx = s.tabs.indexOf(id);
      const tabs = s.tabs.filter((t) => t !== id);
      let activeSessionId = s.activeSessionId;
      if (activeSessionId === id) activeSessionId = tabs[Math.min(idx, tabs.length - 1)];
      return {
        sessions: s.sessions.filter((x) => x.id !== id),
        details,
        unread,
        tabs,
        activeSessionId,
      };
    }),

  clearUnread: (id) =>
    set((s) => {
      if (!s.unread[id]) return s;
      const unread = { ...s.unread };
      delete unread[id];
      return { unread };
    }),

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
        // Mark unread if the update is for a session that isn't currently active.
        unread:
          sessionId !== s.activeSessionId ? { ...s.unread, [sessionId]: true } : s.unread,
      };
    }),
}));
