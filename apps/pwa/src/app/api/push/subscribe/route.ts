import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addSubscription, removeSubscription } from '@/lib/push-store';

/**
 * Store/remove a push subscription for the signed-in user.
 *
 * NOTE: Push payloads are NOT end-to-end encrypted (the push service sees them),
 * so the extension only sends generic "a response finished" style notifications
 * via this channel — never message content. Content stays in the E2E channel.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.ghId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sub = await req.json();
  addSubscription(session.ghId, sub);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.ghId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { endpoint } = await req.json();
  removeSubscription(session.ghId, endpoint);
  return NextResponse.json({ ok: true });
}
