import { MOCK_ASSISTANCE_USERS } from '@/data/mockAssistanceUsers'
import type { AssistanceUser, AssistanceUserRole, UserStats } from '@/types/assistanceUser'
import type { AssistanceRequest } from '@/types/request'

// ── Persistance localStorage ──────────────────────────────────────────────────

const STORE_KEY = 'driveson:assistance-users'

function loadStore(): AssistanceUser[] {
  if (typeof window === 'undefined') return [...MOCK_ASSISTANCE_USERS]
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as AssistanceUser[]
  } catch { /* ignore */ }
  const initial = [...MOCK_ASSISTANCE_USERS]
  try { localStorage.setItem(STORE_KEY, JSON.stringify(initial)) } catch { /* ignore */ }
  return initial
}

function saveStore(data: AssistanceUser[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

// ── Lecture ───────────────────────────────────────────────────────────────────

export function getAllUsers(): AssistanceUser[] {
  return loadStore()
}

export function getUserById(id: string): AssistanceUser | null {
  return loadStore().find(u => u.id === id) ?? null
}

export function getUserByUsername(username: string): AssistanceUser | null {
  return loadStore().find(u => u.username === username.trim().toLowerCase()) ?? null
}

export function getUserByCredentials(username: string, code: string): AssistanceUser | null {
  const user = getUserByUsername(username)
  if (!user || !user.active) return null
  if (user.accessCode !== code.trim()) return null
  return user
}

// ── Écriture ──────────────────────────────────────────────────────────────────

export function createUser(
  data: Omit<AssistanceUser, 'id' | 'createdAt' | 'lastLoginAt'>,
): AssistanceUser {
  const user: AssistanceUser = {
    ...data,
    id:        `u-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  saveStore([...loadStore(), user])
  return user
}

export function updateUser(id: string, patch: Partial<AssistanceUser>): AssistanceUser | null {
  let updated: AssistanceUser | null = null
  saveStore(loadStore().map(u => {
    if (u.id !== id) return u
    updated = { ...u, ...patch }
    return updated
  }))
  return updated
}

export function touchLastLogin(id: string): void {
  updateUser(id, { lastLoginAt: new Date().toISOString() })
}

// ── Visibilité des demandes ───────────────────────────────────────────────────

export function filterRequestsForUser(
  requests: AssistanceRequest[],
  userId: string,
  role: AssistanceUserRole,
): AssistanceRequest[] {
  if (role === 'charge_assistance') {
    return requests.filter(r => r.createdByUserId === userId)
  }
  return requests
}

// ── Statistiques ──────────────────────────────────────────────────────────────

export function getUserStats(
  requests: AssistanceRequest[],
  userId: string,
): UserStats {
  const mine = requests.filter(r => r.createdByUserId === userId)

  const responseTimes: number[] = []
  for (const r of mine) {
    const responseEvt = r.timeline.find(e =>
      e.type === 'confirmation' || e.type === 'refus'
    )
    if (responseEvt) {
      const atMs = responseEvt.at instanceof Date
        ? responseEvt.at.getTime()
        : new Date(responseEvt.at as string).getTime()
      const createdMs = r.createdAt instanceof Date
        ? r.createdAt.getTime()
        : new Date(r.createdAt as string).getTime()
      responseTimes.push(atMs - createdMs)
    }
  }

  return {
    created:       mine.length,
    confirmee:     mine.filter(r => ['confirmee', 'honoree', 'cloturee'].includes(r.status)).length,
    refusee:       mine.filter(r => r.status === 'refusee').length,
    transferee:    mine.filter(r => ['transferee', 'transfert_valide'].includes(r.status)).length,
    avgResponseMs: responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null,
  }
}

// ── Génération de code ────────────────────────────────────────────────────────

export function generateAccessCode(firstName: string, lastName: string): string {
  const part = `${firstName.slice(0, 2)}${lastName.slice(0, 2)}`.toUpperCase()
  const num  = Math.floor(1000 + Math.random() * 9000)
  return `${part}-${num}`
}
