import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { SessionDetail, SessionSummary } from '@vsrchat/protocol';
import { parseSession, readWorkspaceMeta, uriEquals } from './sessionParse.js';

// Re-export pure helpers (kept here for backwards-compatible imports/tests).
export { parseSession, decodeUriPath, basenameFromPath } from './sessionParse.js';

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

  /** The workspaceStorage hash for the currently focused workspace, if known. */
  private activeWorkspaceId(): string | undefined {
    // globalStorageUri => <user>/User/globalStorage/<publisher.ext>
    // workspaceStorage entries sit at <user>/User/workspaceStorage/<hash>.
    // We match the current workspace folder against each <hash>/workspace.json.
    const folders = vscode.workspace.workspaceFolders;
    const wsFile = vscode.workspace.workspaceFile?.toString();
    const target = wsFile ?? folders?.[0]?.uri.toString();
    if (!target) return undefined;
    for (const src of this.chatSessionSources()) {
      if (src.workspaceUri && uriEquals(src.workspaceUri, target)) return src.workspaceId;
    }
    return undefined;
  }

  /**
   * Discover every chat-session directory together with the workspace it
   * belongs to. Reads <hash>/workspace.json to recover the folder/workspace URI.
   */
  private chatSessionSources(): ChatSessionSource[] {
    const sources: ChatSessionSource[] = [];
    const globalStorage = this.context.globalStorageUri.fsPath;
    const userDir = path.resolve(globalStorage, '..', '..'); // .../User

    // Per-workspace sessions: workspaceStorage/<hash>/chatSessions
    const wsBase = path.join(userDir, 'workspaceStorage');
    for (const hash of safeReaddir(wsBase)) {
      const hashDir = path.join(wsBase, hash);
      const sub = path.join(hashDir, 'chatSessions');
      if (!safeExists(sub)) continue;
      const ws = readWorkspaceMeta(path.join(hashDir, 'workspace.json'));
      sources.push({
        dir: sub,
        workspaceId: hash,
        workspaceUri: ws?.uri,
        workspaceName: ws?.name ?? 'Unknown workspace',
        workspacePath: ws?.fsPath,
      });
    }

    // Empty-window / global sessions: User/chatSessions (no workspace).
    const globalChat = path.join(userDir, 'chatSessions');
    if (safeExists(globalChat)) {
      sources.push({
        dir: globalChat,
        workspaceId: undefined,
        workspaceUri: undefined,
        workspaceName: 'No workspace',
        workspacePath: undefined,
      });
    }

    return sources;
  }

  /** Read all mirrored sessions (summaries only). */
  listSummaries(): SessionSummary[] {
    const out: SessionSummary[] = [];
    const activeId = this.activeWorkspaceId();
    for (const src of this.chatSessionSources()) {
      for (const file of safeReaddir(src.dir)) {
        if (!file.endsWith('.json')) continue;
        const detail = this.readFile(path.join(src.dir, file));
        if (detail) {
          out.push({
            id: detail.id,
            title: detail.title,
            updatedAt: detail.updatedAt,
            messageCount: detail.messages.length,
            source: 'mirror',
            workspace: src.workspaceName,
            workspaceId: src.workspaceId,
            workspacePath: src.workspacePath,
            isActiveWorkspace: !!src.workspaceId && src.workspaceId === activeId,
          });
        }
      }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Read a single mirrored session in full. */
  getDetail(id: string): SessionDetail | undefined {
    const activeId = this.activeWorkspaceId();
    for (const src of this.chatSessionSources()) {
      for (const file of safeReaddir(src.dir)) {
        if (!file.endsWith('.json')) continue;
        const detail = this.readFile(path.join(src.dir, file));
        if (detail?.id === id) {
          return {
            ...detail,
            workspace: src.workspaceName,
            workspaceId: src.workspaceId,
            workspacePath: src.workspacePath,
            isActiveWorkspace: !!src.workspaceId && src.workspaceId === activeId,
          };
        }
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
    for (const src of this.chatSessionSources()) {
      try {
        const w = fs.watch(src.dir, { persistent: false }, debounced);
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

interface ChatSessionSource {
  dir: string;
  workspaceId?: string;
  workspaceUri?: string;
  workspaceName: string;
  workspacePath?: string;
}
