import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  swSrc: "worker/index.js",
  disable: process.env.NODE_ENV === "development",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.sparrowsms.com https://esewa.com.np https://khalti.com; img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://images.unsplash.com https://*.images.unsplash.com https://api.dicebear.com https://*.tile.openstreetmap.org https://lh3.googleusercontent.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self' https://esewa.com.np https://khalti.com;",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(withPWA(nextConfig));
