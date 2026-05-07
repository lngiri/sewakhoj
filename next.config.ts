import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://xmptjdwhpgvoyeocccsg.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data: https://xmptjdwhpgvoyeocccsg.supabase.co https://sewakhoj.com; connect-src 'self' https://xmptjdwhpgvoyeocccsg.supabase.co wss://xmptjdwhpgvoyeocccsg.supabase.co;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
