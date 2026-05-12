import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

function scrub(s?: string): string | undefined {
  return s
    ?.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/token[_-]?hash=[^&\s"']+/gi, 'token_hash=[redacted]')
}

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.message) event.message = scrub(event.message) ?? event.message
      event.exception?.values?.forEach(v => {
        if (v.value) v.value = scrub(v.value) ?? v.value
      })
      return event
    },
  })
}
