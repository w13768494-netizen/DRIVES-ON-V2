import { MOCK_LOUEUR_ACCOUNTS } from '@/data/mockLoueurAccounts'
import type { LoueurAccount } from '@/types/loueurAccount'

const STORE_KEY = 'driveson:loueur-accounts'

function loadStore(): LoueurAccount[] {
  if (typeof window === 'undefined') return [...MOCK_LOUEUR_ACCOUNTS]
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as LoueurAccount[]
  } catch { /* ignore */ }
  const initial = [...MOCK_LOUEUR_ACCOUNTS]
  try { localStorage.setItem(STORE_KEY, JSON.stringify(initial)) } catch { /* ignore */ }
  return initial
}

function saveStore(data: LoueurAccount[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function getAllLoueurAccounts(): LoueurAccount[] {
  return loadStore()
}

export function getLoueurByCode(code: string): LoueurAccount | null {
  return loadStore().find(a => a.accessCode === code.trim() && a.active) ?? null
}

export function createLoueurAccount(
  data: Omit<LoueurAccount, 'id' | 'createdAt'>,
): LoueurAccount {
  const account: LoueurAccount = {
    ...data,
    id:        `la-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  saveStore([...loadStore(), account])
  return account
}

export function updateLoueurAccount(id: string, patch: Partial<LoueurAccount>): LoueurAccount | null {
  let updated: LoueurAccount | null = null
  saveStore(loadStore().map(a => {
    if (a.id !== id) return a
    updated = { ...a, ...patch }
    return updated
  }))
  return updated
}

export function touchLoueurLastLogin(id: string): void {
  updateLoueurAccount(id, { lastLoginAt: new Date().toISOString() })
}

export function generateLoueurCode(agencyName: string): string {
  const part = agencyName.replace(/\s+/g, '').slice(0, 4).toUpperCase()
  const num  = Math.floor(1000 + Math.random() * 9000)
  return `${part}-${num}`
}
