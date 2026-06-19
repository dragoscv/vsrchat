import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { auth } from '@/auth';
import { getSubscriptions } from '@/lib/push-store';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@vsrchat.app';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

/** Fan out a (content-free) notification to the user's devices. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.ghId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!ensureConfigured()) return NextResponse.json({ error: 'push-not-configured' }, { status: 503 });

  const { title, body } = (await req.json()) as { title?: string; body?: string };
  const payload = JSON.stringify({
    title: title ?? 'VS Remote Chat',
    body: body ?? 'You have an update.',
  });

  const subs = getSubscriptions(session.ghId);
  await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload)));
  return NextResponse.json({ ok: true, sent: subs.length });
}
