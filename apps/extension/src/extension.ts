import * as vscode from 'vscode';
import { pairingProof } from '@vsrchat/crypto';
import type { AppMessage, ExtMessage, PwaMessage } from '@vsrchat/protocol';
import { resolveIdentity } from './auth.js';
import { ChatRunner } from './chatRunner.js';
import { PairingManager, type StoredPairing } from './pairing.js';
import { showPairingPanel } from './pairingPanel.js';
import { injectIntoRealPanel } from './realPanel.js';
import { RelayClient } from './relayClient.js';
import { SessionStore } from './sessionStore.js';

let controller: Controller | undefined;

export function activate(context: vscode.ExtensionContext): void {
  controller = new Controller(context);
  context.subscriptions.push(
    vscode.commands.registerCommand('vsrchat.pair', () => controller!.pair()),
    vscode.commands.registerCommand('vsrchat.connect', () => controller!.connect()),
    vscode.commands.registerCommand('vsrchat.disconnect', () => controller!.disconnect()),
    vscode.commands.registerCommand('vsrchat.unpair', () => controller!.unpair()),
    vscode.commands.registerCommand('vsrchat.showStatus', () => controller!.showStatus()),
    { dispose: () => controller?.dispose() },
  );
  void controller.maybeAutoConnect();
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}

class Controller {
  private readonly pairingMgr: PairingManager;
  private readonly chat: ChatRunner;
  private readonly sessions: SessionStore;
  private relay?: RelayClient;
  private status: vscode.StatusBarItem;
  private pwaBaseUrl = 'https://vsrchat.dragoscatalin.ro';
  private pairingPanel?: vscode.WebviewPanel;

  constructor(context: vscode.ExtensionContext) {
    this.pairingMgr = new PairingManager(context);
    this.chat = new ChatRunner({
      onDelta: (sessionId, messageId, chunk, done, model) =>
        this.push({ k: 'session.delta', sessionId, messageId, role: 'assistant', chunk, done, model }),
      onFinished: (sessionId) => {
        if (this.cfg<boolean>('notifyOnResponse', true)) {
          this.push({
            k: 'notify',
            title: 'Response finished',
            body: 'Your prompt completed.',
            sessionId,
            reason: 'response-finished',
          });
        }
        this.pushSessions();
      },
      onError: (code, message) => this.push({ k: 'error', code, message }),
    });
    this.sessions = new SessionStore(context, () => this.pushSessions());

    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.status.command = 'vsrchat.showStatus';
    this.setStatus('idle');
    this.status.show();
    context.subscriptions.push(this.status);
  }

  private cfg<T>(key: string, fallback: T): T {
    return vscode.workspace.getConfiguration('vsrchat').get<T>(key, fallback);
  }

  private relayHttpUrl(): string {
    return this.cfg<string>(
      'relayUrl',
      'wss://vsrchat-relay-246756727226.europe-west1.run.app/ws',
    );
  }

  private setStatus(state: 'idle' | 'connecting' | 'online' | 'phone'): void {
    const map = {
      idle: '$(broadcast) vsrchat',
      connecting: '$(sync~spin) vsrchat',
      online: '$(broadcast) vsrchat: waiting',
      phone: '$(device-mobile) vsrchat: phone',
    } as const;
    this.status.text = map[state];
  }

  // ---- Commands ----

  async pair(): Promise<void> {
    const identity = await resolveIdentity(true);
    if (!identity) {
      void vscode.window.showErrorMessage('vsrchat: GitHub sign-in is required to pair.');
      return;
    }
    const pairing = await this.pairingMgr.create(identity.id, identity.login);
    const payload = this.pairingMgr.buildPayload(pairing, this.relayHttpUrl());
    this.pairingPanel = await showPairingPanel(payload, this.pwaBaseUrl, pairing.code);
    this.pairingPanel.onDidDispose(() => {
      this.pairingPanel = undefined;
    });
    void vscode.window.showInformationMessage(
      `vsrchat: scan the QR or enter code ${pairing.code} in the PWA. Connecting…`,
    );
    await this.connect();
  }

  async connect(): Promise<void> {
    const pairing = await this.pairingMgr.load();
    if (!pairing) {
      void vscode.window.showWarningMessage('vsrchat: no paired device. Run "Pair a phone" first.');
      return;
    }
    const identity = await resolveIdentity(true);
    if (!identity) return;

    this.setStatus('connecting');

    // We can only derive the key once the PWA shares its public key. Until then
    // we connect and wait for the pair handshake carried in the first message.
    // For simplicity the salt acts as the pairing secret; key derivation happens
    // when peerPublicKey is known. We bootstrap with a handshake exchange.
    await this.startRelay(pairing, identity.token);
  }

  private async startRelay(pairing: StoredPairing, token: string): Promise<void> {
    this.relay?.close();

    // The real shared key requires the PWA's public key. If we already learned
    // it during a previous pairing, derive now; otherwise we start key-less and
    // derive when the phone announces its public key (kx frame).
    const key = pairing.peerPublicKey ? await this.pairingMgr.deriveKey(pairing) : undefined;

    const wsUrl = this.relayHttpUrl();
    this.relay = new RelayClient({
      relayUrl: wsUrl,
      room: pairing.room,
      role: 'ext',
      authToken: token,
      key,
      ourPublicKey: pairing.keyPair.publicKey,
      // The extension claims the room: GitHub token + pairing proof. The phone
      // then joins with just the proof (from the QR), no separate login.
      proof: pairingProof(pairing.salt),
    });

    this.relay.on('joined', () => this.setStatus('online'));
    this.relay.on('peer', ({ online }) => {
      this.setStatus(online ? 'phone' : 'online');
      if (online && this.relay?.hasKey()) {
        void this.sendHello();
        this.pushSessions();
      }
    });
    this.relay.on('keyExchange', ({ pub }) => void this.onKeyExchange(pairing, pub));
    this.relay.on('message', (msg) => void this.onMessage(msg as PwaMessage));
    this.relay.on('error', ({ message }) => {
      void vscode.window.showErrorMessage(`vsrchat relay: ${message}`);
    });
    this.relay.on('closed', () => {
      // The client auto-reconnects unless we closed it deliberately.
      this.setStatus(this.relay?.wasClosedByUs() ? 'idle' : 'connecting');
    });

    this.relay.connect();
    if (this.cfg<boolean>('mirrorRealSessions', true)) {
      this.sessions.dispose(); // avoid stacking watchers across reconnects
      this.sessions.startWatching();
    }
  }

  /** Complete ECDH once the phone announces its public key. */
  private async onKeyExchange(pairing: StoredPairing, peerPub: string): Promise<void> {
    if (peerPub === pairing.peerPublicKey && this.relay?.hasKey()) return;
    pairing.peerPublicKey = peerPub;
    await this.pairingMgr.save(pairing);
    const key = await this.pairingMgr.deriveKey(pairing);
    this.relay?.setKey(key);
    this.setStatus('phone');
    // Flip the pairing QR panel to its "connected" state.
    this.pairingPanel?.webview.postMessage({ type: 'connected' });
    await this.sendHello();
    this.pushSessions();
  }

  async disconnect(): Promise<void> {
    this.relay?.close();
    this.relay = undefined;
    this.sessions.dispose();
    this.setStatus('idle');
  }

  async unpair(): Promise<void> {
    await this.disconnect();
    await this.pairingMgr.clear();
    void vscode.window.showInformationMessage('vsrchat: all devices unpaired.');
  }

  async showStatus(): Promise<void> {
    const pairing = await this.pairingMgr.load();
    const lines = [
      `Relay: ${this.relayHttpUrl()}`,
      `Paired: ${pairing ? `yes (${pairing.login ?? 'account'})` : 'no'}`,
      `Connected: ${this.relay?.isOpen() ? 'yes' : 'no'}`,
      `Send mode: ${this.cfg<string>('sendMode', 'managed')}`,
    ];
    void vscode.window.showInformationMessage('vsrchat status', { modal: true, detail: lines.join('\n') });
  }

  async maybeAutoConnect(): Promise<void> {
    if (!this.cfg<boolean>('autoConnect', true)) return;
    const pairing = await this.pairingMgr.load();
    if (pairing) await this.connect();
  }

  // ---- Messaging ----

  private push(msg: ExtMessage): void {
    void this.relay?.send(msg as AppMessage);
  }

  private async sendHello(): Promise<void> {
    const ext = vscode.extensions.getExtension('dragoscv.vsrchat');
    this.push({
      k: 'hello',
      machine: vscode.env.machineId.slice(0, 8),
      vscodeVersion: vscode.version,
      extVersion: (ext?.packageJSON?.version as string) ?? '0.0.0',
    });
  }

  private pushSessions(): void {
    const ws = currentWorkspace();
    const managed = this.chat.listSummaries().map((s) => ({
      ...s,
      workspace: ws.name,
      workspaceId: ws.id,
      workspacePath: ws.path,
      isActiveWorkspace: true,
    }));
    const mirrored = this.cfg<boolean>('mirrorRealSessions', true)
      ? this.sessions.listSummaries()
      : [];
    this.push({ k: 'sessions.snapshot', sessions: [...managed, ...mirrored] });
  }

  private async onMessage(msg: PwaMessage): Promise<void> {
    switch (msg.k) {
      case 'hello':
        await this.sendHello();
        this.pushSessions();
        break;
      case 'sessions.list':
        this.pushSessions();
        break;
      case 'session.get': {
        const detail = this.chat.getDetail(msg.id) ?? this.sessions.getDetail(msg.id);
        if (detail) this.push({ k: 'session.snapshot', session: detail });
        else this.push({ k: 'error', code: 'not-found', message: 'Session not found.' });
        break;
      }
      case 'chat.new': {
        const s = this.chat.newSession();
        this.push({ k: 'session.snapshot', session: this.chat.getDetail(s.id)! });
        this.pushSessions();
        break;
      }
      case 'prompt.send': {
        const useRealPanel = msg.realPanel ?? this.cfg<string>('sendMode', 'managed') === 'realPanel';
        if (useRealPanel) {
          const ok = await injectIntoRealPanel(msg.text, msg.agent);
          if (!ok) this.push({ k: 'error', code: 'inject-failed', message: 'Could not inject into the real panel.' });
        } else {
          await this.chat.sendPrompt({ sessionId: msg.sessionId, text: msg.text, modelId: msg.model });
        }
        break;
      }
      case 'prompt.cancel':
        this.chat.cancel(msg.sessionId);
        break;
      case 'models.list':
        this.push({ k: 'models.snapshot', models: await this.chat.listModels() });
        break;
      case 'agent.list':
        this.push({ k: 'agents.snapshot', agents: this.chat.listAgents() });
        break;
      case 'autoapprove.set':
        if (this.cfg<boolean>('allowRemoteAutoApprove', false)) {
          this.chat.setAutoApprove(msg.sessionId, msg.enabled);
        }
        break;
      case 'voice.transcript':
        await this.chat.sendPrompt({ sessionId: msg.sessionId, text: msg.text });
        break;
      case 'tool.approve':
      case 'tool.deny':
      case 'setAutoApprove' as never:
      case 'terminal.list':
      case 'terminal.stop':
      case 'task.stop':
        // Tool/terminal control is surfaced via tool.request events; remote
        // resolution is wired through the managed runner. Acknowledge silently.
        break;
      default:
        break;
    }
  }

  dispose(): void {
    this.relay?.close();
    this.sessions.dispose();
    this.status.dispose();
  }
}

/** Identify the workspace currently focused in this VS Code window. */
function currentWorkspace(): { id?: string; name: string; path?: string } {
  const wsFile = vscode.workspace.workspaceFile;
  if (wsFile && wsFile.scheme !== 'untitled') {
    const base = wsFile.path.split('/').pop() ?? 'workspace';
    return {
      name: base.replace(/\.code-workspace$/i, '') + ' (workspace)',
      path: wsFile.fsPath,
    };
  }
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    return { name: folder.name, path: folder.uri.fsPath };
  }
  return { name: 'No workspace' };
}
