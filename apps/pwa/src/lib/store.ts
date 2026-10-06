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

export type SortKey = 'recent' | 'name' | 'messages';
export interface ListPrefs {
  search: string;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  showAllWorkspaces: boolean;
  filterSource: 'all' | 'managed' | 'mirror';
  filterUnread: boolean;
  pinned: string[];
  manualOrder: string[];
}

/** A connected VS Code window (one extension peer). */
export interface WindowPeer {
  pid: string;
  workspace?: string;
  workspaceId?: string;
  vscodeVersion?: string;
  extVersion?: string;
}

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
  /** Connected VS Code windows, keyed by peer id. */
  windows: Record<string, WindowPeer>;
  /** Which window owns each session id (for routing requests). */
  owners: Record<string, string>;
  /** Sessions currently being fetched (skeletons). */
  loadingDetail: Record<string, boolean>;
  /** True once the first snapshot has arrived. */
  loadedOnce: boolean;
  /** Persisted list UI preferences. */
  prefs: ListPrefs;

  setStatus: (s: RelayStatus | 'idle') => void;
  setPcOnline: (online: boolean) => void;
  setSessions: (s: SessionSummary[], ownerPid?: string) => void;
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
  addWindow: (pid: string, info?: Partial<WindowPeer>) => void;
  removeWindow: (pid: string) => void;
  setLoadingDetail: (id: string, loading: boolean) => void;
  setPrefs: (p: Partial<ListPrefs>) => void;
  togglePin: (id: string) => void;
  reorderSessions: (orderedIds: string[]) => void;
}

const PREFS_KEY = 'vsrchat.listprefs.v1';
const defaultPrefs: ListPrefs = {
  search: '',
  sortKey: 'recent',
  sortDir: 'desc',
  showAllWorkspaces: false,
  filterSource: 'all',
  filterUnread: false,
  pinned: [],
  manualOrder: [],
};
function loadPrefs(): ListPrefs {
  if (typeof localStorage === 'undefined') return defaultPrefs;
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return defaultPrefs;
  }
}
function persistPrefs(p: ListPrefs): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(PREFS_KEY, JSON.stringify(p));
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
  windows: {},
  owners: {},
  loadingDetail: {},
  loadedOnce: false,
  prefs: loadPrefs(),

  setStatus: (status) => set({ status }),
  setPcOnline: (pcOnline) => set({ pcOnline }),
  setSessions: (incoming, ownerPid) =>
    set((s) => {
      // Merge: replace only the sessions owned by this window (ownerPid), keep
      // sessions from other connected windows. Without an ownerPid (cache warm),
      // replace everything.
      let sessions: SessionSummary[];
      const owners = { ...s.owners };
      if (ownerPid) {
        const incomingIds = new Set(incoming.map((x) => x.id));
        // Drop previous sessions owned by this window that are no longer present.
        sessions = s.sessions.filter((x) => s.owners[x.id] !== ownerPid || incomingIds.has(x.id));
        const byId = new Map(sessions.map((x) => [x.id, x] as const));
        for (const sess of incoming) {
          byId.set(sess.id, sess);
          owners[sess.id] = ownerPid;
        }
        sessions = [...byId.values()];
      } else {
        sessions = incoming;
      }
      return { sessions, owners, loadedOnce: true };
    }),
  setDetail: (d) =>
    set((s) => ({
      details: { ...s.details, [d.id]: d },
      loadingDetail: { ...s.loadingDetail, [d.id]: false },
    })),
  setModels: (models) => set({ models }),
  setAgents: (agents) => set({ agents }),
  addTool: (t) => set((s) => ({ pendingTools: [...s.pendingTools, t] })),
  resolveTool: (id) => set((s) => ({ pendingTools: s.pendingTools.filter((t) => t.id !== id) })),

  addWindow: (pid, info) =>
    set((s) => ({ windows: { ...s.windows, [pid]: { pid, ...s.windows[pid], ...info } } })),
  removeWindow: (pid) =>
    set((s) => {
      const windows = { ...s.windows };
      delete windows[pid];
      return { windows };
    }),
  setLoadingDetail: (id, loading) =>
    set((s) => ({ loadingDetail: { ...s.loadingDetail, [id]: loading } })),
  setPrefs: (p) =>
    set((s) => {
      const prefs = { ...s.prefs, ...p };
      persistPrefs(prefs);
      return { prefs };
    }),
  togglePin: (id) =>
    set((s) => {
      const pinned = s.prefs.pinned.includes(id)
        ? s.prefs.pinned.filter((x) => x !== id)
        : [...s.prefs.pinned, id];
      const prefs = { ...s.prefs, pinned };
      persistPrefs(prefs);
      return { prefs };
    }),
  reorderSessions: (orderedIds) =>
    set((s) => {
      const prefs = { ...s.prefs, manualOrder: orderedIds };
      persistPrefs(prefs);
      return { prefs };
    }),
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
