import { auth } from '@/auth';
import { AppShell } from '@/components/app/app-shell';

// No server-side auth gate: a phone that scanned the QR authorizes purely via
// the pairing proof held client-side, so it needs no GitHub login at all.
export default async function AppPage() {
  const session = await auth();
  return <AppShell login={session?.ghLogin ?? 'phone'} />;
}
