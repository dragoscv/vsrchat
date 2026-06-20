import * as vscode from 'vscode';
import type {
  AgentInfo,
  ChatMessage,
  ModelInfo,
  SessionDetail,
  SessionSummary,
} from '@vsrchat/protocol';

export interface ManagedSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  autoApprove: boolean;
}

export interface DeltaSink {
  onDelta(sessionId: string, messageId: string, chunk: string, done: boolean, model?: string): void;
  onFinished(sessionId: string, message: ChatMessage): void;
  onError(code: string, message: string): void;
}

/**
 * Runs prompts via VS Code's Language Model API (`vscode.lm`). This is the
 * reliable "managed" path: it streams responses and uses your Copilot models.
 */
export class ChatRunner {
  private sessions = new Map<string, ManagedSession>();
  private cancels = new Map<string, vscode.CancellationTokenSource>();

  constructor(private readonly sink: DeltaSink) {}

  listSummaries(): SessionSummary[] {
    return [...this.sessions.values()]
      .map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
        source: 'managed' as const,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getDetail(id: string): SessionDetail | undefined {
    const s = this.sessions.get(id);
    if (!s) return undefined;
    return {
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      messageCount: s.messages.length,
      source: 'managed',
      messages: s.messages,
    };
  }

  newSession(): ManagedSession {
    const id = `managed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const s: ManagedSession = {
      id,
      title: 'New chat',
      updatedAt: Date.now(),
      messages: [],
      autoApprove: false,
    };
    this.sessions.set(id, s);
    return s;
  }

  setAutoApprove(sessionId: string, enabled: boolean): void {
    const s = this.sessions.get(sessionId);
    if (s) s.autoApprove = enabled;
  }

  /** Rename a managed session. Returns true if it existed. */
  renameSession(id: string, title: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.title = title.trim() || s.title;
    s.updatedAt = Date.now();
    return true;
  }

  /** Delete a managed session. Returns true if it existed. */
  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const models = await vscode.lm.selectChatModels();
      return models.map((m) => ({
        id: m.id,
        vendor: m.vendor,
        family: m.family,
        name: m.name,
        maxInputTokens: m.maxInputTokens,
      }));
    } catch {
      return [];
    }
  }

  /** Agent modes are not directly enumerable; expose the standard set. */
  listAgents(): AgentInfo[] {
    return [
      { id: 'ask', name: 'Ask', description: 'Question answering' },
      { id: 'edit', name: 'Edit', description: 'Multi-file edits' },
      { id: 'agent', name: 'Agent', description: 'Autonomous multi-step agent' },
    ];
  }

  cancel(sessionId: string): void {
    this.cancels.get(sessionId)?.cancel();
  }

  /** Send a prompt and stream the response back through the sink. */
  async sendPrompt(args: {
    sessionId?: string;
    text: string;
    modelId?: string;
  }): Promise<string> {
    const session = args.sessionId
      ? (this.sessions.get(args.sessionId) ?? this.newSession())
      : this.newSession();

    const userMsg: ChatMessage = {
      id: `${session.id}-u${session.messages.length}`,
      role: 'user',
      text: args.text,
      createdAt: Date.now(),
    };
    session.messages.push(userMsg);
    session.updatedAt = Date.now();
    if (session.title === 'New chat') session.title = args.text.slice(0, 60);

    const models = await vscode.lm.selectChatModels(
      args.modelId ? { id: args.modelId } : { vendor: 'copilot' },
    );
    const model = models[0];
    if (!model) {
      this.sink.onError('no-model', 'No language model is available. Is Copilot signed in?');
      return session.id;
    }

    const assistantMsg: ChatMessage = {
      id: `${session.id}-a${session.messages.length}`,
      role: 'assistant',
      text: '',
      createdAt: Date.now(),
      pending: true,
      model: model.name,
    };
    session.messages.push(assistantMsg);

    const cts = new vscode.CancellationTokenSource();
    this.cancels.set(session.id, cts);

    try {
      const history = session.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(0, -1)
        .map((m) =>
          m.role === 'user'
            ? vscode.LanguageModelChatMessage.User(m.text)
            : vscode.LanguageModelChatMessage.Assistant(m.text),
        );

      const response = await model.sendRequest(history, {}, cts.token);
      for await (const fragment of response.text) {
        assistantMsg.text += fragment;
        this.sink.onDelta(session.id, assistantMsg.id, fragment, false, model.name);
      }
      assistantMsg.pending = false;
      session.updatedAt = Date.now();
      this.sink.onDelta(session.id, assistantMsg.id, '', true, model.name);
      this.sink.onFinished(session.id, assistantMsg);
    } catch (err) {
      assistantMsg.pending = false;
      const message = err instanceof Error ? err.message : String(err);
      this.sink.onError('lm-error', message);
    } finally {
      this.cancels.delete(session.id);
      cts.dispose();
    }

    return session.id;
  }
}
