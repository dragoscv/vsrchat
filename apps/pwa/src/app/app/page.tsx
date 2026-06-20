import { auth } from '@/auth';
import { AppShell } from '@/components/app/app-shell';

// No server-side auth gate: a phone that scanned the QR authorizes via the
// pairing proof (held client-side), so it needs no GitHub login. We still pass
// the GitHub token when a session exists (web fallback / direct visits).
export default async function AppPage() {
  const session = await auth();
  return <AppShell authToken={session?.ghToken} login={session?.ghLogin ?? 'phone'} />;
}
