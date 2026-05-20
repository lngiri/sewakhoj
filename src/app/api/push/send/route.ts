import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import webPush from 'web-push';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:admin@sewakhoj.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function POST(req: Request) {
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get() { return ''; }, set() {}, remove() {} }
    }
  );

  try {
    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Authenticate the requesting user
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ success: false, error: 'No push subscription found' }, { status: 404 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log('VAPID keys not configured - logging push:');
      console.log(`Push to ${user_id}:`, { title, body, data });
      return NextResponse.json({ success: true, mock: true });
    }

    const payload = JSON.stringify({
      title,
      body,
      data: data || {},
      icon: '/logo.png',
      badge: '/logo.png'
    });

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key
        }
      },
      payload
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Push notification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}