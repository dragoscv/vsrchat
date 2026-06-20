/** Relay configuration from environment. */
export interface RelayConfig {
  port: number;
  /** Comma-separated GitHub user IDs allowed to connect. Single-user => one id. */
  allowedGithubIds: string[];
  /** Comma-separated GitHub logins allowed (fallback / convenience). */
  allowedGithubLogins: string[];
  /** Max peers per room (ext + pwa(s)). */
  maxPeersPerRoom: number;
  /** Idle socket timeout in ms. */
  idleTimeoutMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RelayConfig {
  return {
    port: Number(env.PORT ?? 8080),
    allowedGithubIds: (env.VSRCHAT_ALLOWED_GITHUB_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    allowedGithubLogins: (env.VSRCHAT_ALLOWED_GITHUB_LOGINS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    // 1 extension + several phones. Generous default for multi-device.
    maxPeersPerRoom: Number(env.VSRCHAT_MAX_PEERS ?? 9),
    idleTimeoutMs: Number(env.VSRCHAT_IDLE_TIMEOUT_MS ?? 5 * 60_000),
  };
}
