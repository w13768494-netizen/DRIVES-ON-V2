/**
 * Retourne l'URL publique de l'application, sans slash final.
 * - Dev   : fallback http://localhost:3000 si absente
 * - Prod  : erreur explicite si absente (évite des liens morts dans les emails)
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[config] NEXT_PUBLIC_APP_URL est obligatoire en production. ' +
        'Ajoutez cette variable dans votre hébergeur (Vercel → Settings → Environment Variables).',
      )
    }
    return 'http://localhost:3000'
  }
  return url.trim().replace(/\/$/, '')
}
