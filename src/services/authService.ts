'use client'

import { createClient }              from '@/lib/supabase/client'
import { setSession, clearSession }  from './currentSessionService'
import type { UserRole, AppSession } from '@/types/session'

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
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile?.role) {
    return { session: null, error: 'Profil introuvable. Contactez un administrateur.' }
  }

  const meta = data.user.user_metadata
  const session: AppSession = {
    role:      profile.role as UserRole,
    userId:    data.user.id,
    userName:  meta.full_name ?? email,
    company:   meta.company_name ?? '',
    createdAt: new Date().toISOString(),
  }
  setSession(session)
  return { session, error: null }
}

// ── signUp ────────────────────────────────────────────────────────────────────
// TypeScript interdit 'admin' — le trigger handle_new_user le bloque aussi côté DB.

export async function signUp(
  email: string,
  password: string,
  role: Exclude<UserRole, 'admin'>,
  fullName: string,
  companyName: string,
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, full_name: fullName, company_name: companyName } },
  })
  return { error: error?.message ?? null }
}

// ── signOut ───────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  clearSession()
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.role) { clearSession(); return null }

  const meta = user.user_metadata
  const session: AppSession = {
    role:      profile.role as UserRole,
    userId:    user.id,
    userName:  meta.full_name ?? user.email ?? '',
    company:   meta.company_name ?? '',
    createdAt: new Date().toISOString(),
  }
  setSession(session)
  return session
}
