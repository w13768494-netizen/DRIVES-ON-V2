// localStorage cache — sync read/write for non-async service calls.
// Supabase is the source of truth; this is kept in sync by authService.

import type { AppSession, UserRole } from '@/types/session'
import type { AssistanceUserRole }   from '@/types/assistanceUser'

// backward-compat alias
export type MockSession = AppSession

const SESSION_KEY = 'driveson:session'

export function getSession(): AppSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AppSession) : null
  } catch {
    return null
  }
}

export function setSession(session: AppSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}

export function getRole(): UserRole | null {
  return getSession()?.role ?? null
}

export function getUserId(): string | null {
  return getSession()?.userId ?? null
}

export function getCompanyRole(): AssistanceUserRole | null {
  return getSession()?.companyRole ?? null
}
