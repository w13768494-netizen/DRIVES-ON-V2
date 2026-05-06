import { MOCK_REQUEST_DOCUMENTS } from '@/data/mockRequestDocuments'
import type { RequestDocument } from '@/types/requestDocument'

// ── Persistance localStorage ──────────────────────────────────────────────────

const STORE_KEY = 'driveson:documents:v3'

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value)
  }
  return value
}

function loadStore(): RequestDocument[] {
  if (typeof window === 'undefined') return [...MOCK_REQUEST_DOCUMENTS]
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw, reviveDates) as RequestDocument[]
  } catch { /* ignore */ }
  const initial = [...MOCK_REQUEST_DOCUMENTS]
  try { localStorage.setItem(STORE_KEY, JSON.stringify(initial)) } catch { /* ignore */ }
  return initial
}

function saveStore(data: RequestDocument[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function generateId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function getDocumentsByRequest(requestId: string): Promise<RequestDocument[]> {
  await delay(300)
  return loadStore()
    .filter(d => d.requestId === requestId)
    .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
}

export async function addDocument(
  data: Omit<RequestDocument, 'id' | 'addedAt'>,
): Promise<RequestDocument> {
  await delay(900)
  const doc: RequestDocument = { ...data, id: generateId(), addedAt: new Date() }
  saveStore([doc, ...loadStore()])
  return doc
}

export async function deleteDocument(id: string): Promise<void> {
  await delay(300)
  saveStore(loadStore().filter(d => d.id !== id))
}
