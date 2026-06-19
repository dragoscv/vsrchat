import { z } from 'zod';

/**
 * Application messages (the decrypted plaintext of a SealedEnvelope).
 * These are the real semantics of vsrchat. The relay never sees these.
 */

// ---------- Shared value objects ----------

export const ChatRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ModelInfoSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  family: z.string().optional(),
  name: z.string(),
  maxInputTokens: z.number().int().optional(),
});
export type ModelInfo = z.infer<typeof ModelInfoSchema>;

export const AgentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});
export type AgentInfo = z.infer<typeof AgentInfoSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: ChatRoleSchema,
  text: z.string(),
  createdAt: z.number().int(),
  /** True while still streaming. */
  pending: z.boolean().optional(),
  model: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const SessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.number().int(),
  messageCount: z.number().int().nonnegative(),
  /** 'mirror' = read from the real Copilot panel; 'managed' = a vsrchat vscode.lm session. */
  source: z.enum(['mirror', 'managed']),
  workspace: z.string().optional(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export const SessionDetailSchema = SessionSummarySchema.extend({
  messages: z.array(ChatMessageSchema),
});
export type SessionDetail = z.infer<typeof SessionDetailSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  kind: z.enum(['tool', 'terminal', 'task']),
  /** Human-readable preview, e.g. the command to run. */
  preview: z.string(),
  createdAt: z.number().int(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const TerminalInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  running: z.boolean(),
});
export type TerminalInfo = z.infer<typeof TerminalInfoSchema>;

export const AttachmentSchema = z.object({
  name: z.string(),
  mime: z.string(),
  /** base64 data (already inside the E2E envelope). */
  data: z.string(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

// ---------- Messages: PWA -> EXT (requests/commands) ----------

const fromPwa = {
  hello: z.object({ k: z.literal('hello'), client: z.string(), version: z.string() }),
  listSessions: z.object({ k: z.literal('sessions.list') }),
  getSession: z.object({ k: z.literal('session.get'), id: z.string() }),
  newChat: z.object({
    k: z.literal('chat.new'),
    model: z.string().optional(),
    agent: z.string().optional(),
  }),
  sendPrompt: z.object({
    k: z.literal('prompt.send'),
    sessionId: z.string().optional(),
    text: z.string(),
    model: z.string().optional(),
    agent: z.string().optional(),
    attachments: z.array(AttachmentSchema).optional(),
    /** Experimental: inject into the real Copilot panel instead of vscode.lm. */
    realPanel: z.boolean().optional(),
  }),
  cancelPrompt: z.object({ k: z.literal('prompt.cancel'), sessionId: z.string() }),
  listModels: z.object({ k: z.literal('models.list') }),
  listAgents: z.object({ k: z.literal('agent.list') }),
  approveTool: z.object({ k: z.literal('tool.approve'), id: z.string() }),
  denyTool: z.object({ k: z.literal('tool.deny'), id: z.string() }),
  setAutoApprove: z.object({
    k: z.literal('autoapprove.set'),
    sessionId: z.string(),
    enabled: z.boolean(),
  }),
  listTerminals: z.object({ k: z.literal('terminal.list') }),
  stopTerminal: z.object({ k: z.literal('terminal.stop'), id: z.string() }),
  stopTask: z.object({ k: z.literal('task.stop'), id: z.string() }),
  voice: z.object({ k: z.literal('voice.transcript'), sessionId: z.string().optional(), text: z.string() }),
} as const;

export const PwaMessageSchema = z.discriminatedUnion('k', [
  fromPwa.hello,
  fromPwa.listSessions,
  fromPwa.getSession,
  fromPwa.newChat,
  fromPwa.sendPrompt,
  fromPwa.cancelPrompt,
  fromPwa.listModels,
  fromPwa.listAgents,
  fromPwa.approveTool,
  fromPwa.denyTool,
  fromPwa.setAutoApprove,
  fromPwa.listTerminals,
  fromPwa.stopTerminal,
  fromPwa.stopTask,
  fromPwa.voice,
]);
export type PwaMessage = z.infer<typeof PwaMessageSchema>;

// ---------- Messages: EXT -> PWA (state/events) ----------

const fromExt = {
  hello: z.object({
    k: z.literal('hello'),
    machine: z.string(),
    vscodeVersion: z.string(),
    extVersion: z.string(),
  }),
  sessions: z.object({ k: z.literal('sessions.snapshot'), sessions: z.array(SessionSummarySchema) }),
  session: z.object({ k: z.literal('session.snapshot'), session: SessionDetailSchema }),
  delta: z.object({
    k: z.literal('session.delta'),
    sessionId: z.string(),
    messageId: z.string(),
    role: ChatRoleSchema,
    /** Appended text fragment. */
    chunk: z.string(),
    done: z.boolean().optional(),
    model: z.string().optional(),
  }),
  models: z.object({ k: z.literal('models.snapshot'), models: z.array(ModelInfoSchema) }),
  agents: z.object({ k: z.literal('agents.snapshot'), agents: z.array(AgentInfoSchema) }),
  toolRequest: z.object({ k: z.literal('tool.request'), call: ToolCallSchema }),
  toolResolved: z.object({
    k: z.literal('tool.resolved'),
    id: z.string(),
    outcome: z.enum(['approved', 'denied', 'expired']),
  }),
  terminals: z.object({ k: z.literal('terminal.snapshot'), terminals: z.array(TerminalInfoSchema) }),
  terminalOutput: z.object({ k: z.literal('terminal.output'), id: z.string(), chunk: z.string() }),
  notify: z.object({
    k: z.literal('notify'),
    title: z.string(),
    body: z.string(),
    sessionId: z.string().optional(),
    reason: z.enum(['response-finished', 'input-needed', 'tool-request', 'error']),
  }),
  error: z.object({ k: z.literal('error'), code: z.string(), message: z.string() }),
} as const;

export const ExtMessageSchema = z.discriminatedUnion('k', [
  fromExt.hello,
  fromExt.sessions,
  fromExt.session,
  fromExt.delta,
  fromExt.models,
  fromExt.agents,
  fromExt.toolRequest,
  fromExt.toolResolved,
  fromExt.terminals,
  fromExt.terminalOutput,
  fromExt.notify,
  fromExt.error,
]);
export type ExtMessage = z.infer<typeof ExtMessageSchema>;

/** Either direction of application message. */
export const AppMessageSchema = z.union([PwaMessageSchema, ExtMessageSchema]);
export type AppMessage = z.infer<typeof AppMessageSchema>;
