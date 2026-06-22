import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const isDev = process.env.NODE_ENV === 'development'

const CSP = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org${isDev ? ' http://127.0.0.1:54321 ws://127.0.0.1:54321' : ''}`,
  "font-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy',             value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Resource-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Opener-Policy',     value: 'same-origin' },
          { key: 'Content-Security-Policy',        value: CSP },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  silent:      true,
  telemetry:   false,
  sourcemaps:  { disable: true },
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware:      false,
})
