'use client'

import { useState, useEffect, useRef }  from 'react'
import {
  X, ExternalLink, Loader2, CheckCircle2, AlertTriangle,
  Bell, FileText, Eye, Upload, Clock,
} from 'lucide-react'
import { assisteurResolveOverdue }       from '@/services/requestService'
import { getDocumentsByRequest, addDocument } from '@/services/documentService'
import { REQUEST_DOCUMENT_TYPE_LABELS, REQUEST_DOCUMENT_TYPE_COLORS } from '@/types/requestDocument'
import type { AssistanceRequest }        from '@/types/request'
import type { RequestDocument }          from '@/types/requestDocument'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssisteurDrawerMode = 'overdue' | 'relance' | 'docs'

export interface AssisteurDrawerState {
  request: AssistanceRequest
  mode:    AssisteurDrawerMode
}

interface Props {
  state:     AssisteurDrawerState | null
  onClose:   () => void
  onSuccess: (updated: AssistanceRequest) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr()  { return new Date().toISOString().split('T')[0] }
function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Panel régularisation OVERDUE ──────────────────────────────────────────────

function OverduePanel({
  request,
  onSuccess,
}: {
  request:   AssistanceRequest
  onSuccess: (r: AssistanceRequest) => void
}) {
  const [date,          setDate]          = useState(todayStr)
  const [time,          setTime]          = useState(nowTimeStr)
  const [justification, setJustification] = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [done,          setDone]          = useState(false)

  const justifValid = justification.trim().length >= 10

  async function handleConfirm() {
    if (!justifValid) return
    setError(null)
    setLoading(true)
    try {
      const returnedAt = new Date(`${date}T${time}`)
      const updated    = await assisteurResolveOverdue(request.id, returnedAt, justification.trim())
      if (!updated) {
        setError("Impossible de régulariser — le dossier n'est peut-être plus en statut overdue.")
        return
      }
      setDone(true)
      setTimeout(() => onSuccess(updated), 800)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer ou contacter l\'administration.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="font-bold text-slate-900">Retour enregistré</p>
        <p className="text-sm text-slate-500">Le dossier passe en attente de paiement.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Alerte contexte */}
      <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Dossier en retard</p>
          <p className="text-xs text-red-700 mt-0.5">
            Déclarez le retour effectif du véhicule pour sortir ce dossier du statut overdue.
          </p>
        </div>
      </div>

      {/* Résumé */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
      </div>

      {/* Date/heure retour */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Date et heure de retour effective
        </p>
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={e => setDate(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
            />
          </div>
          <div className="w-28 flex flex-col gap-1">
            <label className="text-xs text-slate-500">Heure</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Justification obligatoire */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Justification <span className="text-red-500">*</span>
        </label>
        <textarea
          value={justification}
          onChange={e => setJustification(e.target.value)}
          rows={3}
          placeholder="Ex : retour confirmé par téléphone avec le sinistré, véhicule restitué au loueur le..."
          className={`border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 transition-colors ${
            justification.length > 0 && !justifValid
              ? 'border-red-300 focus:ring-red-300 focus:border-red-400'
              : 'border-slate-200 focus:ring-brand-400/30 focus:border-brand-400'
          }`}
        />
        <p className={`text-xs mt-0.5 ${justifValid ? 'text-slate-400' : 'text-red-500'}`}>
          {justification.trim().length < 10
            ? `${10 - justification.trim().length} caractères minimum`
            : 'Justification valide'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading || !justifValid}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Déclarer le retour et régulariser
        </button>
        <a
          href={`/assisteur/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Panel relance ─────────────────────────────────────────────────────────────

function RelancePanel({
  request,
  onSuccess,
}: {
  request:   AssistanceRequest
  onSuccess: (r: AssistanceRequest) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)
  const [waitMin, setWaitMin] = useState<number | null>(null)

  // Calculer le délai restant anti-spam depuis la timeline locale
  const RELANCE_TYPES = new Set(['admin_relance', 'partenaire_relance'])
  const lastRelance = [...(request.timeline ?? [])]
    .filter(e => RELANCE_TYPES.has(e.type))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]

  const minutesSinceLast = lastRelance
    ? (Date.now() - new Date(lastRelance.at).getTime()) / 60000
    : null

  const isSpamBlocked = minutesSinceLast !== null && minutesSinceLast < 30

  async function handleRelance() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/assisteur/requests/${request.id}/relance`, { method: 'POST' })
      const body = await res.json() as { ok?: boolean; error?: string; minutesRemaining?: number }
      if (!res.ok) {
        if (res.status === 429 && body.minutesRemaining) {
          setWaitMin(body.minutesRemaining)
        }
        setError(body.error ?? 'Erreur lors de la relance')
        return
      }
      setDone(true)
      // Rafraîchir la request locale (pas de données retournées par la route → on force un reload)
      setTimeout(() => onSuccess(request), 800)
    } catch {
      setError('Erreur réseau — vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Bell className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="font-bold text-slate-900">Relance envoyée</p>
        <p className="text-sm text-slate-500">Le ou les loueurs assignés ont été notifiés.</p>
      </div>
    )
  }

  const agencyCount = [
    ...(request.assignedAgencyIds ?? []),
    ...(request.assignedAgencyId ? [request.assignedAgencyId] : []),
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Résumé */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {agencyCount} loueur{agencyCount > 1 ? 's' : ''} assigné{agencyCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Info anti-spam */}
      {lastRelance && minutesSinceLast !== null && (
        <div className={`flex items-start gap-2 p-3 rounded-xl border ${
          isSpamBlocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${isSpamBlocked ? 'text-amber-500' : 'text-slate-400'}`} />
          <p className={`text-xs ${isSpamBlocked ? 'text-amber-700' : 'text-slate-500'}`}>
            {isSpamBlocked
              ? `Dernière relance il y a ${Math.floor(minutesSinceLast)} min — réessayez dans ${waitMin ?? Math.ceil(30 - minutesSinceLast)} min`
              : `Dernière relance il y a ${Math.floor(minutesSinceLast)} min`}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleRelance}
          disabled={loading || isSpamBlocked}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          {isSpamBlocked ? 'Relance déjà envoyée' : `Relancer ${agencyCount} loueur${agencyCount > 1 ? 's' : ''}`}
        </button>
        <a
          href={`/assisteur/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Panel documents ───────────────────────────────────────────────────────────

const CRITICAL_TYPES = ['prise_en_charge', 'contrat', 'facture', 'etat_retour'] as const

function DocsPanel({ request }: { request: AssistanceRequest }) {
  const [docs,         setDocs]         = useState<RequestDocument[]>([])
  const [loadingDocs,  setLoadingDocs]  = useState(true)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDocumentsByRequest(request.id).then(d => {
      setDocs(d)
      setLoadingDocs(false)
    })
  }, [request.id])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const doc = await addDocument({ file, requestId: request.id, type: 'prise_en_charge', owner: 'assisteur' })
      setDocs(prev => [doc, ...prev])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const criticalDocs = CRITICAL_TYPES.map(type => ({
    type,
    label:     REQUEST_DOCUMENT_TYPE_LABELS[type],
    colorCls:  REQUEST_DOCUMENT_TYPE_COLORS[type],
    documents: docs.filter(d => d.type === type),
  }))

  const hasPc = docs.some(d => d.type === 'prise_en_charge')

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Upload PC */}
      {!hasPc && ['acceptee', 'confirmee', 'honoree'].includes(request.status) && (
        <div className="flex flex-col gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm font-semibold text-orange-800">Prise en charge manquante</p>
          <p className="text-xs text-orange-700">Ajoutez la prise en charge pour compléter le dossier.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
          >
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Upload className="w-4 h-4" />
            }
            {uploading ? 'Upload en cours…' : 'Ajouter la prise en charge'}
          </button>
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </div>
      )}

      {/* Docs critiques */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Documents clés</p>

        {loadingDocs ? (
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          criticalDocs.map(({ type, label, colorCls, documents }) => (
            <div key={type} className={`flex items-center justify-between p-3 rounded-xl border ${
              documents.length > 0 ? colorCls : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 shrink-0 ${documents.length > 0 ? '' : 'text-slate-300'}`} />
                <div>
                  <p className={`text-xs font-semibold ${documents.length === 0 ? 'text-slate-400' : ''}`}>
                    {label}
                  </p>
                  {documents.length > 0 && (
                    <p className="text-[10px] opacity-70">
                      {documents.length} fichier{documents.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              {documents.length > 0 ? (
                <div className="flex gap-1">
                  {documents.slice(0, 2).map(doc => (
                    doc.viewUrl ? (
                      <a
                        key={doc.id}
                        href={doc.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors"
                        title={doc.fileName}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    ) : null
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Manquant</span>
              )}
            </div>
          ))
        )}
      </div>

      <a
        href={`/assisteur/demandes/${request.id}`}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Tous les documents du dossier
      </a>
    </div>
  )
}

// ── Drawer principal ──────────────────────────────────────────────────────────

const DRAWER_TITLES: Record<AssisteurDrawerMode, string> = {
  overdue: 'Régulariser l\'overdue',
  relance: 'Relancer les loueurs',
  docs:    'Documents du dossier',
}

export function AssisteurOperationsDrawer({ state, onClose, onSuccess }: Props) {
  useEffect(() => {
    if (!state) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, onClose])

  return (
    <>
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          state ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />
      <div
        className={[
          'fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          state ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-900">
            {state ? DRAWER_TITLES[state.mode] : ''}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {state?.mode === 'overdue' && (
            <OverduePanel request={state.request} onSuccess={onSuccess} />
          )}
          {state?.mode === 'relance' && (
            <RelancePanel request={state.request} onSuccess={onSuccess} />
          )}
          {state?.mode === 'docs' && (
            <DocsPanel request={state.request} />
          )}
        </div>
      </div>
    </>
  )
}
