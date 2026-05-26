import type { FormValues } from '@/components/assisteur/AssistanceRequestForm'

const DRAFT_KEY = 'driveson:draft:nouvelle-demande:v1'

export interface StoredDraft {
  savedAt: string           // ISO timestamp
  values:  Partial<FormValues>
}

export function saveDraft(values: Partial<FormValues>): void {
  if (typeof window === 'undefined') return
  try {
    const draft: StoredDraft = { savedAt: new Date().toISOString(), values }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch { /* quota exceeded — ignore */ }
}

export function loadDraft(): StoredDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredDraft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}

export function isDraftExpired(draft: StoredDraft): boolean {
  const dateNeeded = draft.values.dateNeeded
  if (!dateNeeded) return false
  return new Date(dateNeeded) < new Date()
}
