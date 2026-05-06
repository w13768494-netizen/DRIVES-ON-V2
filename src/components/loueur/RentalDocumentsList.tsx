import { useState } from 'react'
import { FileText, Trash2, Loader2 } from 'lucide-react'
import {
  DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS, DOCUMENT_BADGE_LABELS,
} from '@/types/rentalDocument'
import type { RentalDocument, RentalDocumentType } from '@/types/rentalDocument'

// Uniquement les types avec un badge significatif
const BADGE_TYPES: RentalDocumentType[] = ['contrat', 'etat_depart', 'etat_retour', 'facture']

interface Props {
  documents: RentalDocument[]
  onDelete:  (id: string) => Promise<void>
}

function formatSize(kb?: number): string {
  if (!kb) return ''
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} Mo` : `${kb} Ko`
}

export function RentalDocumentsList({ documents, onDelete }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const receivedTypes = new Set(documents.map(d => d.type))

  async function handleDelete(id: string) {
    setDeleting(id)
    setConfirming(null)
    await onDelete(id)
    setDeleting(null)
  }

  const activeBadges = BADGE_TYPES.filter(t => receivedTypes.has(t))

  return (
    <div className="flex flex-col gap-4">
      {/* Badges de statut */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeBadges.map(type => (
            <span
              key={type}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${DOCUMENT_TYPE_COLORS[type]}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {DOCUMENT_BADGE_LABELS[type]}
            </span>
          ))}
        </div>
      )}

      {/* Liste */}
      {documents.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-6">
          Aucun document ajouté pour l'instant.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-start gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3"
            >
              {/* Icône */}
              <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg border ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                <FileText className="w-4 h-4" />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800 truncate">{doc.fileName}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                    {DOCUMENT_TYPE_LABELS[doc.type]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                  <span>
                    {new Date(doc.addedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {doc.sizeKb && <span>{formatSize(doc.sizeKb)}</span>}
                </div>
                {doc.comment && (
                  <p className="text-xs text-slate-500 mt-1 italic">{doc.comment}</p>
                )}
              </div>

              {/* Supprimer */}
              {confirming === doc.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {deleting === doc.id && <Loader2 className="w-3 h-3 animate-spin" />}
                    Supprimer
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 border border-slate-200 rounded-lg"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(doc.id)}
                  className="shrink-0 text-slate-300 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
