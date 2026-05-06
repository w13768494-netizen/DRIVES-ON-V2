import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'DRIVES ON — Mise en relation assisteurs & loueurs',
  description: 'Plateforme de mise en relation entre assisteurs auto et loueurs indépendants pour véhicules de remplacement.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
