import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory rate limit store (per-IP+path, resets on server restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_ACTIONS_PER_WINDOW = 30;
const MAX_SENSITIVE_ACTIONS_PER_WINDOW = 5;

const SENSITIVE_PATHS = [
  '/api/admin/reveal-key',
  '/api/esewa/',
  '/api/khalti/',
];

const SUPPORTED_LOCALES = ['en', 'ne'];
const DEFAULT_LOCALE = 'en';

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

function isRateLimited(key: string, isSensitive: boolean): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  const maxActions = isSensitive ? MAX_SENSITIVE_ACTIONS_PER_WINDOW : MAX_ACTIONS_PER_WINDOW;

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > maxActions;
}

// Parse Accept-Language header to detect preferred locale
function detectLocaleFromHeaders(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language') || '';
  // Format: "en-US,en;q=0.9,ne;q=0.8"
  const languages = acceptLanguage.split(',').map(l => {
    const [tag] = l.split(';');
    return tag ? tag.trim().split('-')[0] : '';
  }).filter(Boolean);

  for (const lang of languages) {
    if (SUPPORTED_LOCALES.includes(lang)) {
      return lang;
    }
  }
  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  // Rate limiting for admin API routes
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/admin/') || pathname.startsWith('/api/esewa/') || pathname.startsWith('/api/khalti/')) {
    const key = getRateLimitKey(request);
    const isSensitive = SENSITIVE_PATHS.some(p => pathname.startsWith(p));

    if (isRateLimited(key, isSensitive)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspHeader = `
    default-src 'none';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' blob: data: https://*.supabase.co https://sewakhoj.com https://*.sewakhoj.com https://images.unsplash.com https://*.images.unsplash.com https://api.dicebear.com https://*.tile.openstreetmap.org https://*.googleusercontent.com https://lh3.googleusercontent.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tile.openstreetmap.org https://api.dicebear.com https://images.unsplash.com https://api.ipify.org https://lh3.googleusercontent.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    manifest-src 'self';
    worker-src 'self' blob:;
    media-src 'self';
    frame-src 'self';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── Locale detection (cookie-based) ──────────────────────
  // Check if NEXT_LOCALE cookie exists; if not, detect and set it
  const existingLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (!existingLocale || !SUPPORTED_LOCALES.includes(existingLocale)) {
    const detectedLocale = detectLocaleFromHeaders(request);
    supabaseResponse.cookies.set('NEXT_LOCALE', detectedLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
  }

  // Refresh session and get user
  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Protect tasker onboarding routes
  if (request.nextUrl.pathname.startsWith('/tasker/onboard')) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
