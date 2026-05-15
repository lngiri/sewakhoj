import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limit store (per-admin, resets on server restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_ACTIONS_PER_WINDOW = 30;
const MAX_SENSITIVE_ACTIONS_PER_WINDOW = 5;

const SENSITIVE_PATHS = [
  '/api/admin/reveal-key',
  '/api/esewa/',
  '/api/khalti/',
];

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for admin API routes
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

  // Admin route protection — redirect non-admins away from admin pages
  // Note: Actual auth check happens client-side via useAdminAuth hook;
  // this is a defense-in-depth measure
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminToken = request.cookies.get('sb-access-token')?.value;
    // If no auth cookie at all, redirect to login
    // (The client-side hook will handle the actual role check)
    if (!adminToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/esewa/:path*',
    '/api/khalti/:path*',
    '/admin/:path*',
  ],
};