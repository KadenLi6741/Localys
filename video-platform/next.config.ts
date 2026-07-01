import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';

    // Dev needs 'unsafe-eval' for React/Next.js hot-reload; strip it in prod.
    // Google Maps JS API + its web-workers also require 'unsafe-eval', so allow it
    // in prod too (scoped to maps.googleapis.com loading the SDK).
    // challenges.cloudflare.com serves the Turnstile api.js used on login/signup
    // (frame-src + connect-src already allow it; script-src must too or the widget
    // never loads and login is blocked).
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com maps.googleapis.com challenges.cloudflare.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com maps.googleapis.com challenges.cloudflare.com";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "img-src 'self' data: blob: *.supabase.co *.cloudfront.net img.icons8.com via.placeholder.com maps.googleapis.com maps.gstatic.com *.gstatic.com *.googleapis.com",
      // media-src must explicitly allow Supabase storage + blob: or <video> elements
      // with cross-origin src will throw NotSupportedError (no supported sources).
      "media-src 'self' blob: data: *.supabase.co *.cloudfront.net",
      "connect-src 'self' *.supabase.co wss://*.supabase.co api.stripe.com challenges.cloudflare.com *.tile.openstreetmap.org maps.googleapis.com",
      // www.google.com hosts the Maps Embed iframe; maps.googleapis.com for JS map frames.
      "frame-src js.stripe.com *.stripe.com challenges.cloudflare.com www.google.com maps.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    const headers = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
    ];

    if (!isDev) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [{ source: '/(.*)', headers }];
  },
  images: {
    // Serve AVIF first (≈20–30% smaller than WebP), then WebP, then the original.
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images at the edge/browser for 31 days so repeat views and
    // re-navigations don't re-hit the optimizer (the cold-optimize is the slow part).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // UberEats CDN hosts for hotlinked store/menu-item images (onboarded stores)
      { protocol: 'https', hostname: 'tb-static.uber.com' },
      { protocol: 'https', hostname: 'd1ralsognjng37.cloudfront.net' },
      { protocol: 'https', hostname: 'cn-geo1.uber.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'https', hostname: 'duyt4h9nfnj50.cloudfront.net' },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
