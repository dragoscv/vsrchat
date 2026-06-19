import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ChatMessage, SessionDetail } from '@vsrchat/protocol';

/**
 * Pure parsing/identity helpers for chat sessions and workspaces.
 *
 * Kept free of any `vscode` import so it can be unit-tested in a plain Node
 * (vitest) environment.
 */

export interface WorkspaceMeta {
  /** Normalized workspace URI (folder or .code-workspace file). */
  uri: string;
  /** Human-readable name (last path segment). */
  name: string;
  /** Decoded filesystem path for display. */
  fsPath: string;
}

/** Read and interpret a workspaceStorage/<hash>/workspace.json file. */
export function readWorkspaceMeta(file: string): WorkspaceMeta | undefined {
  let json: { folder?: string; workspace?: string } | undefined;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
  const raw = json?.folder ?? json?.workspace;
  if (!raw) return undefined;
  const fsPath = decodeUriPath(raw);
  const isWorkspaceFile = !!json?.workspace && !json?.folder;
  let name = basenameFromPath(fsPath);
  if (isWorkspaceFile) {
    // "<name>.code-workspace" → "<name> (workspace)"
    name = name.replace(/\.code-workspace$/i, '') + ' (workspace)';
  }
  return { uri: raw, name, fsPath };
}

/** Decode a file:// URI to a readable path. */
export function decodeUriPath(uri: string): string {
  try {
    let p = uri.replace(/^file:\/\//, '');
    p = decodeURIComponent(p);
    // Strip the leading slash on Windows drive paths: /e:/x → e:/x
    if (/^\/[a-zA-Z]:/.test(p)) p = p.slice(1);
    return p;
  } catch {
    return uri;
  }
}

/** Last meaningful path segment, used as the workspace display name. */
export function basenameFromPath(p: string): string {
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/);
  return parts[parts.length - 1] || p;
}

/** Compare two workspace URIs, tolerant of encoding/trailing-slash differences. */
export function uriEquals(a: string, b: string): boolean {
  const norm = (u: string) => {
    try {
      return decodeURIComponent(u).replace(/\/+$/, '').toLowerCase();
    } catch {
      return u.replace(/\/+$/, '').toLowerCase();
    }
  };
  return norm(a) === norm(b);
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

export function extractResponseText(response: unknown): string {
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
