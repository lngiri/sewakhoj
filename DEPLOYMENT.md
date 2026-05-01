# Cloudflare Pages Deployment Guide for SewaKhoj

## Fix for 404 Error on https://sewakhoj.pages.dev/

The 404 error occurs because Cloudflare Pages isn't properly configured for Next.js 16. Follow these steps:

## Option 1: Use Vercel (Recommended for Next.js)

Vercel natively supports Next.js 16 with zero configuration:

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to: `sewakhoj`
4. Add environment variables (see below)
5. Deploy - it works automatically!

## Option 2: Fix Cloudflare Pages Deployment

### Step 1: Update Cloudflare Pages Settings

In your Cloudflare Pages dashboard, go to **Settings > Build & Deploy > Build configuration** and set:

- **Build command:** `cd sewakhoj && npm install --legacy-peer-deps && npm run build`
- **Build output directory:** `.next`
- **Root directory:** `sewakhoj` (if your repo has the sewakhoj folder at root)
- **Node.js version:** `18` or later

### Step 2: Add Environment Variables

Go to **Settings > Environment variables** and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://sewakhoj.pages.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
RESEND_API_KEY=your_resend_api_key
```

### Step 3: Update Supabase OAuth Redirect

In Supabase Dashboard > Authentication > URL Configuration:
- Add redirect URL: `https://sewakhoj.pages.dev/auth/callback`

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **Retry deployment** on the latest deployment
3. Or push a new commit to trigger deployment

## Option 3: Use Static Export (Simpler but limited)

If you don't need server-side features, you can use static export:

Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};
```

Then in Cloudflare Pages:
- Build command: `cd sewakhoj && npm run build`
- Output directory: `out`

**Note:** This won't work with Supabase auth (needs server-side).

## Recommended Solution

**Use Vercel** - it's the easiest and most reliable for Next.js 16. Cloudflare Pages requires additional configuration with `@cloudflare/next-on-pages` adapter which has compatibility issues with Next.js 16.
