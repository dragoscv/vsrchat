import type { PushSubscription } from 'web-push';

/**
 * In-memory subscription store. For a single-user PWA this is sufficient; for a
 * multi-instance deployment, back this with Redis/Postgres. Subscriptions are
 * keyed by GitHub user id.
 */
const store = new Map<string, Map<string, PushSubscription>>();

export function addSubscription(userId: string, sub: PushSubscription): void {
  let m = store.get(userId);
  if (!m) {
    m = new Map();
    store.set(userId, m);
  }
  m.set(sub.endpoint, sub);
}

export function removeSubscription(userId: string, endpoint: string): void {
  store.get(userId)?.delete(endpoint);
}

export function getSubscriptions(userId: string): PushSubscription[] {
  return [...(store.get(userId)?.values() ?? [])];
}
