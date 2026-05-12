'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ color: '#FF6B35' }}>Une erreur inattendue est survenue</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Notre équipe a été notifiée. Vous pouvez réessayer ou revenir à l&apos;accueil.
        </p>
        <button
          onClick={reset}
          style={{
            background: '#FF6B35',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.6rem 1.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
