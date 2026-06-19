import type { RelayConfig } from './config.js';

export interface GithubIdentity {
  id: string;
  login: string;
}

/**
 * Verify a GitHub access token by calling the GitHub API, and check it against
 * the single-user allowlist. The relay only uses this to authorize a socket;
 * it never stores the token and cannot read any E2E payloads.
 */
export async function verifyGithubToken(
  token: string,
  config: RelayConfig,
): Promise<GithubIdentity | null> {
  let res: Response;
  try {
    res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vsrchat-relay',
      },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: number; login?: string };
  if (user.id == null || !user.login) return null;

  const id = String(user.id);
  const login = user.login.toLowerCase();

  const idOk = config.allowedGithubIds.length === 0 || config.allowedGithubIds.includes(id);
  const loginOk =
    config.allowedGithubLogins.length === 0 || config.allowedGithubLogins.includes(login);

  // If any allowlist is configured, the identity must satisfy it.
  const hasAllowlist =
    config.allowedGithubIds.length > 0 || config.allowedGithubLogins.length > 0;
  if (hasAllowlist && !(idOk && (config.allowedGithubLogins.length === 0 || loginOk))) {
    return null;
  }

  return { id, login };
}
