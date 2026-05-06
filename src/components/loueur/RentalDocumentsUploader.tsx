'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, Paperclip, X } from 'lucide-react'
import { DOCUMENT_TYPE_LABELS } from '@/types/rentalDocument'
import type { RentalDocument, RentalDocumentType } from '@/types/rentalDocument'

const DOC_TYPES: RentalDocumentType[] = ['contrat', 'etat_depart', 'etat_retour', 'facture', 'autre']

interface Props {
  requestId: string
  onAdd:     (doc: RentalDocument) => void
  onSubmit:  (data: Omit<RentalDocument, 'id' | 'addedAt'>) => Promise<RentalDocument>
}

export function RentalDocumentsUploader({ requestId, onAdd, onSubmit }: Props) {
  const [type, setType]         = useState<RentalDocumentType>('contrat')
  const [fileName, setFileName] = useState('')
  const [sizeKb, setSizeKb]     = useState<number | undefined>()
  const [comment, setComment]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setSizeKb(Math.round(file.size / 1024))
    setError(null)
  }

  function clearFile() {
    setFileName('')
    setSizeKb(undefined)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fileName) { setError('Sélectionnez un fichier.'); return }
    setError(null)
    setUploading(true)
    try {
      const doc = await onSubmit({ requestId, type, fileName, comment: comment || undefined, sizeKb })
      onAdd(doc)
      clearFile()
      setComment('')
      setType('contrat')
    } catch {
      setError("Erreur lors de l'ajout du document.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Type de document</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as RentalDocumentType)}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {DOC_TYPES.map(t => (
              <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Fichier */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Fichier</label>
          {fileName ? (
            <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-3 py-2">
              <Paperclip className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1">{fileName}</span>
              {sizeKb && <span className="text-xs text-slate-400 shrink-0">{sizeKb >= 1024 ? `${(sizeKb/1024).toFixed(1)} Mo` : `${sizeKb} Ko`}</span>}
              <button type="button" onClick={clearFile} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 border border-dashed border-slate-300 hover:border-brand-400 bg-white hover:bg-brand-50 rounded-xl px-3 py-2 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Choisir un fichier…</span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          )}
        </div>
      </div>

      {/* Commentaire */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Commentaire (optionnel)</label>
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="ex. Signé en agence lors de la remise des clés"
          className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={uploading || !fileName}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Ajout en cours…' : 'Ajouter le document'}
        </button>
        <p className="text-xs text-slate-400">Upload simulé — aucun fichier transmis au serveur</p>
      </div>
    </form>
  )
}
