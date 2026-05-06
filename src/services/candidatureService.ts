import { MOCK_CANDIDATURES } from '@/data/mockCandidatures'
import type { Candidature, CandidatureRole } from '@/types/candidature'

const STORE_KEY = 'driveson:candidatures:v1'
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value)
  }
  return value
}

function loadStore(): Candidature[] {
  if (typeof window === 'undefined') return [...MOCK_CANDIDATURES]
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw, reviveDates) as Candidature[]
  } catch { /* ignore */ }
  const initial = [...MOCK_CANDIDATURES]
  try { localStorage.setItem(STORE_KEY, JSON.stringify(initial)) } catch { /* ignore */ }
  return initial
}

function saveStore(data: Candidature[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

function generateId(): string {
  return `cand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export async function getCandidatures(): Promise<Candidature[]> {
  await delay(400)
  return loadStore().sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
}

export async function submitCandidature(
  data: Omit<Candidature, 'id' | 'status' | 'submittedAt'>,
): Promise<Candidature> {
  await delay(1200)
  const candidature: Candidature = {
    ...data,
    id:          generateId(),
    status:      'en_attente',
    submittedAt: new Date(),
  }
  saveStore([candidature, ...loadStore()])
  return candidature
}

export async function reviewCandidature(
  id:     string,
  status: 'acceptee' | 'refusee',
  note?:  string,
): Promise<Candidature | null> {
  await delay(500)
  const store = loadStore()
  let updated: Candidature | null = null
  saveStore(store.map(c => {
    if (c.id !== id) return c
    updated = { ...c, status, reviewedAt: new Date(), reviewNote: note || undefined }
    return updated
  }))
  return updated
}

export async function getCandidaturesByRole(role: CandidatureRole): Promise<Candidature[]> {
  const all = await getCandidatures()
  return all.filter(c => c.role === role)
}
