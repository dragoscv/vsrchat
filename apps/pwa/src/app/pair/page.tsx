import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PairClient } from '@/components/pair/pair-client';

export default async function PairPage() {
  const session = await auth();
  if (!session) redirect('/login?callbackUrl=/pair');
  return <PairClient />;
}
