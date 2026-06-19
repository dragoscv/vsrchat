import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppShell } from '@/components/app/app-shell';

export default async function AppPage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/app');
  if (!session.ghToken) redirect('/login');

  return <AppShell authToken={session.ghToken} login={session.ghLogin ?? 'you'} />;
}
