'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Upload, Trash2, Loader2, Eye, EyeOff, Link } from 'lucide-react'
import { getDocumentsByRequest, addDocument, deleteDocument } from '@/services/documentService'
import {
  REQUEST_DOCUMENT_TYPE_LABELS,
  REQUEST_DOCUMENT_TYPE_COLORS,
  ASSISTEUR_DOCUMENT_TYPES,
  LOUEUR_DOCUMENT_TYPES,
} from '@/types/requestDocument'
import type { RequestDocument, RequestDocumentType, RequestDocumentOwner } from '@/types/requestDocument'
import type { RequestStatus } from '@/types/request'

interface Props {
  requestId:   string
  viewerRole:  RequestDocumentOwner
  status:      RequestStatus
}

export function SharedRequestDocuments({ requestId, viewerRole, status }: Props) {
  const [docs, setDocs]           = useState<RequestDocument[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getDocumentsByRequest(requestId).then(d => { setDocs(d); setLoading(false) })
  }, [requestId])

  const handleDelete = useCallback(async (id: string) => {
    await deleteDocument(id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }, [])

  const handleAdd = useCallback((doc: RequestDocument) => {
    setDocs(prev => [doc, ...prev])
  }, [])

  const assisteurDocs = docs.filter(d => d.owner === 'assisteur')
  const loueurDocs    = docs.filter(d => d.owner === 'loueur')

  const canUpload = status === 'confirmee' || status === 'honoree' || status === 'envoyee' || status === 'recue'

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Chargement des documents…
        </div>
      ) : (
        <>
          {/* Section assisteur */}
          <DocSection
            title="Documents assisteur"
            docs={assisteurDocs}
            onDelete={viewerRole === 'assisteur' ? handleDelete : undefined}
          >
            {viewerRole === 'assisteur' && canUpload && (
              <DocUploader
                requestId={requestId}
                owner="assisteur"
                allowedTypes={ASSISTEUR_DOCUMENT_TYPES}
                onAdd={handleAdd}
              />
            )}
          </DocSection>

          {/* Section loueur */}
          <DocSection
            title="Documents loueur"
            docs={loueurDocs}
            onDelete={viewerRole === 'loueur' ? handleDelete : undefined}
          >
            {viewerRole === 'loueur' && (status === 'confirmee' || status === 'honoree') && (
              <DocUploader
                requestId={requestId}
                owner="loueur"
                allowedTypes={LOUEUR_DOCUMENT_TYPES}
                onAdd={handleAdd}
              />
            )}
          </DocSection>
        </>
      )}
    </div>
  )
}

// ── Sous-section ─────────────────────────────────────────────────────────────

function DocSection({
  title, docs, onDelete, children,
}: {
  title:     string
  docs:      RequestDocument[]
  onDelete?: (id: string) => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {title}
        <span className="text-xs font-normal text-slate-400">({docs.length})</span>
      </h3>

      {children}

      {docs.length === 0 ? (
        <p className="text-xs text-slate-400 italic pl-1">Aucun document.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map(doc => (
            <DocItem key={doc.id} doc={doc} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  )
}

function DocItem({ doc, onDelete }: { doc: RequestDocument; onDelete?: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const colorCls = REQUEST_DOCUMENT_TYPE_COLORS[doc.type]

  async function handleDelete() {
    if (!onDelete || !confirm('Supprimer ce document ?')) return
    setDeleting(true)
    await onDelete(doc.id)
  }

  const viewHref = doc.viewUrl ?? doc.url ?? null

  return (
    <li className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${colorCls}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{REQUEST_DOCUMENT_TYPE_LABELS[doc.type]}</p>
        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs opacity-70 truncate flex items-center gap-1 hover:underline"
          >
            <Link className="w-3 h-3 shrink-0" />
            {doc.url.length > 50 ? doc.url.slice(0, 50) + '…' : doc.url}
          </a>
        ) : (
          <p className="text-xs opacity-70 truncate">{doc.fileName}</p>
        )}
        {doc.comment && <p className="text-xs opacity-60 mt-0.5 italic">"{doc.comment}"</p>}
        {doc.sizeKb && <p className="text-xs opacity-50 mt-0.5">{doc.sizeKb < 1024 ? `${doc.sizeKb} Ko` : `${(doc.sizeKb / 1024).toFixed(1)} Mo`}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {viewHref ? (
          <a
            href={viewHref}
            target="_blank"
            rel="noopener noreferrer"
            title={doc.url ? 'Ouvrir le lien' : 'Ouvrir le document'}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
          >
            {doc.url
              ? <Link className="w-3.5 h-3.5 opacity-70" />
              : <Eye  className="w-3.5 h-3.5 opacity-70" />
            }
          </a>
        ) : (
          <span title="Aperçu non disponible" className="p-1.5 opacity-30 cursor-default">
            <EyeOff className="w-3.5 h-3.5" />
          </span>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Supprimer"
            className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </li>
  )
}

// ── Uploader ──────────────────────────────────────────────────────────────────

function DocUploader({
  requestId, owner, allowedTypes, onAdd,
}: {
  requestId:    string
  owner:        RequestDocumentOwner
  allowedTypes: RequestDocumentType[]
  onAdd:        (doc: RequestDocument) => void
}) {
  const [type, setType]       = useState<RequestDocumentType>(allowedTypes[0])
  const [file, setFile]       = useState<File | null>(null)
  const [comment, setComment] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleUpload() {
    if (!file) { setError('Sélectionnez un fichier.'); return }
    setError(null)
    setUploading(true)
    try {
      const doc = await addDocument({ file, requestId, type, owner, comment: comment || undefined })
      onAdd(doc)
      setFile(null)
      setComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout du document.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Type de document</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as RequestDocumentType)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {allowedTypes.map(t => (
              <option key={t} value={t}>{REQUEST_DOCUMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fichier (PDF, image)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:text-xs file:font-semibold hover:file:bg-brand-100"
          />
        </div>
      </div>
      <input
        type="text"
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Commentaire (optionnel)"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Upload en cours…</>
          : <><Upload className="w-4 h-4" />Ajouter le document</>
        }
      </button>
    </div>
  )
}
