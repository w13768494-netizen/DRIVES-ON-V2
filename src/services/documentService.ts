import type { RequestDocument, RequestDocumentType, RequestDocumentOwner } from '@/types/requestDocument'
import type { DocumentApiResponse } from '@/lib/documents/helpers'

// ── Types d'entrée pour addDocument ──────────────────────────────────────────

export type AddDocumentByFile = {
  file:      File
  requestId: string
  type:      RequestDocumentType
  owner:     RequestDocumentOwner
  comment?:  string
}

export type AddDocumentByUrl = {
  url:       string
  requestId: string
  type:      RequestDocumentType
  owner:     RequestDocumentOwner
  comment?:  string
}

// ── Mapping réponse API → RequestDocument ────────────────────────────────────

function responseToDocument(r: DocumentApiResponse): RequestDocument {
  return {
    id:               r.id,
    requestId:        r.requestId,
    type:             r.type,
    owner:            r.owner,
    fileName:         r.fileName,
    addedAt:          new Date(r.addedAt),
    comment:          r.comment,
    sizeKb:           r.sizeKb,
    viewUrl:          r.viewUrl,
    url:              r.url,
    validationStatus: r.validationStatus,
    validatedAt:      r.validatedAt ? new Date(r.validatedAt) : undefined,
    validationNote:   r.validationNote,
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function getDocumentsByRequest(requestId: string): Promise<RequestDocument[]> {
  const res = await fetch(`/api/documents?requestId=${encodeURIComponent(requestId)}`)
  if (!res.ok) {
    console.error('[documentService] getDocumentsByRequest', res.status)
    return []
  }
  const data = (await res.json()) as DocumentApiResponse[]
  return data.map(responseToDocument)
}

export async function addDocument(
  params: AddDocumentByFile | AddDocumentByUrl,
): Promise<RequestDocument> {
  if ('file' in params) {
    const fd = new FormData()
    fd.append('file',      params.file)
    fd.append('requestId', params.requestId)
    fd.append('type',      params.type)
    fd.append('owner',     params.owner)
    if (params.comment) fd.append('comment', params.comment)

    const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Erreur inconnue' })) as { error?: string }
      throw new Error(body.error ?? "Erreur lors de l'upload")
    }
    return responseToDocument((await res.json()) as DocumentApiResponse)
  }

  // Lien externe
  const res = await fetch('/api/documents/link', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      url:       params.url,
      requestId: params.requestId,
      type:      params.type,
      owner:     params.owner,
      comment:   params.comment,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erreur inconnue' })) as { error?: string }
    throw new Error(body.error ?? "Erreur lors de l'enregistrement du lien")
  }
  return responseToDocument((await res.json()) as DocumentApiResponse)
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erreur inconnue' })) as { error?: string }
    throw new Error(body.error ?? 'Erreur lors de la suppression')
  }
}
