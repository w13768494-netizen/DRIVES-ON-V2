/**
 * Validation des variables d'environnement au démarrage du serveur Next.js.
 * - Variables toujours requises : erreur en dev comme en prod si absentes
 * - Variables prod-only : warning en dev, erreur en prod
 */
export function register() {
  const isProd = process.env.NODE_ENV === 'production'

  const REQUIRED_ALWAYS: string[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const REQUIRED_PROD: string[] = [
    'NEXT_PUBLIC_APP_URL',
    'POSTMARK_API_KEY',
    'NOTIFY_FROM_EMAIL',
  ]

  const missingCritical  = REQUIRED_ALWAYS.filter(k => !process.env[k])
  const missingProdOnly  = REQUIRED_PROD.filter(k => !process.env[k])

  if (missingCritical.length > 0) {
    console.error(
      `\n⛔ [config] Variables critiques manquantes : ${missingCritical.join(', ')}\n` +
      `   L'application ne fonctionnera pas correctement.\n`,
    )
  }

  if (missingProdOnly.length > 0) {
    if (isProd) {
      console.error(
        `\n⛔ [config] Variables obligatoires en production manquantes : ${missingProdOnly.join(', ')}\n` +
        `   Emails et liens d'invitation seront non fonctionnels.\n`,
      )
    } else {
      console.warn(
        `\n⚠  [config] Variables prod non définies (ignorées en dev) : ${missingProdOnly.join(', ')}\n`,
      )
    }
  }
}
