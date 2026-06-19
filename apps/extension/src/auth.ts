import * as vscode from 'vscode';

/** GitHub scopes we need: read the user identity to lock the relay to one account. */
const SCOPES = ['read:user'];

export interface VsrchatIdentity {
  token: string;
  id: string;
  login: string;
}

/**
 * Get the user's GitHub session via VS Code's built-in authentication provider.
 * The token is used to authenticate to the relay (which checks the allowlist).
 */
export async function getGithubSession(createIfNone: boolean): Promise<vscode.AuthenticationSession | undefined> {
  return vscode.authentication.getSession('github', SCOPES, {
    createIfNone,
    silent: !createIfNone,
  });
}

/** Resolve the GitHub numeric id + login for the signed-in account. */
export async function resolveIdentity(createIfNone: boolean): Promise<VsrchatIdentity | undefined> {
  const session = await getGithubSession(createIfNone);
  if (!session) return undefined;

  // VS Code's session.account.id is the GitHub numeric id for the github provider.
  // Confirm login via the API for the allowlist + display.
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vsrchat-extension',
      },
    });
    if (res.ok) {
      const user = (await res.json()) as { id: number; login: string };
      return { token: session.accessToken, id: String(user.id), login: user.login };
    }
  } catch {
    /* fall through to session account */
  }
  return {
    token: session.accessToken,
    id: session.account.id,
    login: session.account.label,
  };
}
