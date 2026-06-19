import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ChatMessage, SessionDetail, SessionSummary } from '@vsrchat/protocol';

/**
 * Reads (mirrors) the real Copilot Chat sessions that VS Code persists on disk.
 *
 * VS Code stores chat sessions as JSON under each workspace's storage:
 *   <globalStorage>/.. /workspaceStorage/<hash>/chatSessions/*.json
 * The exact shape is internal and can change between versions, so we parse
 * defensively and degrade gracefully (the managed vscode.lm sessions are the
 * reliable path; mirroring is best-effort read-only).
 */
export class SessionStore {
  private watchers: fs.FSWatcher[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onChange: () => void,
  ) {}

  /** Candidate directories that may hold chat session JSON files. */
  private chatSessionDirs(): string[] {
    const dirs: string[] = [];
    // globalStorageUri => <user>/User/globalStorage/<publisher.ext>
    // We climb to the User dir, then look at workspaceStorage/*/chatSessions and
    // User/chatSessions / User/chatEditingSessions.
    const globalStorage = this.context.globalStorageUri.fsPath;
    const userDir = path.resolve(globalStorage, '..', '..'); // .../User
    const candidates = [
      path.join(userDir, 'workspaceStorage'),
      path.join(userDir, 'chatSessions'),
    ];
    for (const base of candidates) {
      if (!safeExists(base)) continue;
      if (path.basename(base) === 'chatSessions') {
        dirs.push(base);
        continue;
      }
      // workspaceStorage/<hash>/chatSessions
      for (const entry of safeReaddir(base)) {
        const sub = path.join(base, entry, 'chatSessions');
        if (safeExists(sub)) dirs.push(sub);
      }
    }
    return dirs;
  }

  /** Read all mirrored sessions (summaries only). */
  listSummaries(): SessionSummary[] {
    const out: SessionSummary[] = [];
    for (const dir of this.chatSessionDirs()) {
      for (const file of safeReaddir(dir)) {
        if (!file.endsWith('.json')) continue;
        const detail = this.readFile(path.join(dir, file));
        if (detail) {
          out.push({
            id: detail.id,
            title: detail.title,
            updatedAt: detail.updatedAt,
            messageCount: detail.messages.length,
            source: 'mirror',
            workspace: detail.workspace,
          });
        }
      }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Read a single mirrored session in full. */
  getDetail(id: string): SessionDetail | undefined {
    for (const dir of this.chatSessionDirs()) {
      for (const file of safeReaddir(dir)) {
        if (!file.endsWith('.json')) continue;
        const detail = this.readFile(path.join(dir, file));
        if (detail?.id === id) return detail;
      }
    }
    return undefined;
  }

  private readFile(file: string): SessionDetail | undefined {
    let json: unknown;
    try {
      json = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return undefined;
    }
    return parseSession(json, file);
  }

  /** Watch session directories and fire onChange (debounced) when they change. */
  startWatching(): void {
    let timer: NodeJS.Timeout | undefined;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(this.onChange, 400);
    };
    for (const dir of this.chatSessionDirs()) {
      try {
        const w = fs.watch(dir, { persistent: false }, debounced);
        this.watchers.push(w);
      } catch {
        /* ignore unwatchable dirs */
      }
    }
  }

  dispose(): void {
    for (const w of this.watchers) w.close();
    this.watchers = [];
  }
}

function safeExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function safeReaddir(p: string): string[] {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

/** Defensive parser for the internal chat-session JSON shape. */
export function parseSession(json: unknown, file: string): SessionDetail | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const obj = json as Record<string, unknown>;

  const id = String(obj.sessionId ?? obj.id ?? path.basename(file, '.json'));
  const requests = (obj.requests ?? obj.messages ?? []) as unknown[];
  const messages: ChatMessage[] = [];

  for (let i = 0; i < requests.length; i++) {
    const r = requests[i] as Record<string, unknown> | undefined;
    if (!r) continue;
    // user request text
    const message = r.message as Record<string, unknown> | string | undefined;
    const userText =
      typeof message === 'string' ? message : ((message?.text as string) ?? (r.text as string) ?? '');
    if (userText) {
      messages.push({
        id: `${id}-u${i}`,
        role: 'user',
        text: userText,
        createdAt: Number(r.timestamp ?? 0) || Date.now(),
      });
    }
    // assistant response (may be array of parts)
    const response = r.response as unknown;
    const respText = extractResponseText(response);
    if (respText) {
      messages.push({
        id: `${id}-a${i}`,
        role: 'assistant',
        text: respText,
        createdAt: Number(r.timestamp ?? 0) || Date.now(),
      });
    }
  }

  const title =
    (obj.customTitle as string) ||
    (obj.title as string) ||
    messages.find((m) => m.role === 'user')?.text.slice(0, 60) ||
    'Untitled chat';

  let updatedAt = 0;
  try {
    updatedAt = fs.statSync(file).mtimeMs;
  } catch {
    updatedAt = Date.now();
  }

  return {
    id,
    title,
    updatedAt,
    messageCount: messages.length,
    source: 'mirror',
    messages,
  };
}

function extractResponseText(response: unknown): string {
  if (!response) return '';
  if (typeof response === 'string') return response;
  if (Array.isArray(response)) {
    return response
      .map((part) => {
        if (typeof part === 'string') return part;
        const p = part as Record<string, unknown>;
        if (typeof p.value === 'string') return p.value;
        if (typeof p.text === 'string') return p.text;
        return '';
      })
      .join('');
  }
  const r = response as Record<string, unknown>;
  if (typeof r.value === 'string') return r.value;
  return '';
}
