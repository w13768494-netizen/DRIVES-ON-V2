'use client'

import { createClient }                        from '@/lib/supabase/client'
import { setSession, clearSession }            from './currentSessionService'
import type { UserRole, AccountType, AppSession } from '@/types/session'
import type { AssistanceUserRole }             from '@/types/assistanceUser'

// ── signIn ────────────────────────────────────────────────────────────────────
// Le rôle est lu depuis profiles (source de vérité protégée par trigger),
// jamais depuis user_metadata qui est modifiable par l'utilisateur.

export async function signIn(
  email: string,
  password: string,
): Promise<{ session: AppSession | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return { session: null, error: error?.message ?? 'Erreur inconnue' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, account_type, org_id, team_role, is_active')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile?.role) {
    return { session: null, error: 'Profil introuvable. Contactez un administrateur.' }
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut()
    return { session: null, error: 'Compte désactivé. Contactez un administrateur.' }
  }

  const meta = data.user.user_metadata
  const session: AppSession = {
    role:        profile.role as UserRole,
    accountType: (profile.account_type as AccountType) ?? undefined,
    userId:      data.user.id,
    userName:    meta.full_name ?? email,
    company:     meta.company_name ?? '',
    orgId:       (profile.org_id as string) ?? undefined,
    companyRole: (profile.team_role as AssistanceUserRole | null) ?? undefined,
    createdAt:   new Date().toISOString(),
  }
  setSession(session)
  return { session, error: null }
}

// ── signOut ───────────────────────────────────────────────────────────────────

// Clés localStorage sensibles purgées à la déconnexion (PII / données métier).
// On conserve les préférences UI non sensibles (ex. driveson:sidebar).
const SENSITIVE_KEYS = [
  'driveson:draft:nouvelle-demande:v1', // PII sinistré
  'driveson:requests:v3',                // dossiers (fallback)
  'driveson:candidatures:v1',            // candidatures (fallback)
]

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  clearSession()
  if (typeof window !== 'undefined') {
    for (const k of SENSITIVE_KEYS) {
      try { localStorage.removeItem(k) } catch { /* ignore */ }
    }
  }
}

// ── refreshSession ────────────────────────────────────────────────────────────
// Appelé au montage des layouts pour ré-hydrater le cache localStorage.
// Lit le rôle depuis profiles — pas user_metadata.

export async function refreshSession(): Promise<AppSession | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { clearSession(); return null }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, account_type, org_id, team_role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.role) { clearSession(); return null }

  if (profile.is_active === false) { await supabase.auth.signOut(); clearSession(); return null }

  const meta = user.user_metadata
  const session: AppSession = {
    role:        profile.role as UserRole,
    accountType: (profile.account_type as AccountType) ?? undefined,
    userId:      user.id,
    userName:    meta.full_name ?? user.email ?? '',
    company:     meta.company_name ?? '',
    orgId:       (profile.org_id as string) ?? undefined,
    companyRole: (profile.team_role as AssistanceUserRole | null) ?? undefined,
    createdAt:   new Date().toISOString(),
  }
  setSession(session)
  return session
}
