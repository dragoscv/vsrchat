import * as vscode from 'vscode';

/**
 * Experimental: inject a prompt into the REAL Copilot Chat panel.
 *
 * VS Code exposes `workbench.action.chat.open` which can pre-fill (and, on some
 * builds, auto-submit) a query. Auto-submit behaviour is not officially
 * guaranteed and may vary by version, so this is best-effort only. The reliable
 * path is the managed `vscode.lm` runner.
 */
export async function injectIntoRealPanel(text: string, mode?: string): Promise<boolean> {
  try {
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: text,
      mode: mode ?? 'agent',
      // Some builds honour this to submit immediately.
      isPartialQuery: false,
    });
    return true;
  } catch {
    try {
      // Fallback: open the panel and place the text in the input.
      await vscode.commands.executeCommand('workbench.action.chat.open', text);
      return true;
    } catch {
      return false;
    }
  }
}
