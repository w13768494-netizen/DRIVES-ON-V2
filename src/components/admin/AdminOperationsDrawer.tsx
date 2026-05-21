'use client'

import { useState, useEffect, useRef }  from 'react'
import {
  X, ExternalLink, Loader2, CheckCircle2, AlertTriangle,
  Bell, FileText, Eye, Clock, StickyNote, CheckCheck,
  ArrowRightLeft, CreditCard, Flag,
} from 'lucide-react'
import { saveAdminNote, saveAdminFlags }         from '@/services/adminDossierService'
import { getDocumentsByRequest }                 from '@/services/documentService'
import { REQUEST_DOCUMENT_TYPE_LABELS, REQUEST_DOCUMENT_TYPE_COLORS } from '@/types/requestDocument'
import type { AdminReservation }                 from '@/types/adminReservation'
import type { RequestDocument }                  from '@/types/requestDocument'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminDrawerMode = 'resolve' | 'relance' | 'note' | 'flags' | 'docs' | 'finance'

export interface AdminDrawerState {
  request: AdminReservation
  mode:    AdminDrawerMode
}

interface Props {
  state:     AdminDrawerState | null
  onClose:   () => void
  onSuccess: () => void
}

// ── Config résolution statut ───────────────────────────────────────────────────

interface ResolveConfig {
  toStatus:     string
  title:        string
  description:  string
  noteRequired: boolean
  btnLabel:     string
  btnColor:     string
  icon:         React.ReactNode
}

const RESOLVE_CONFIG: Record<string, ResolveConfig> = {
  overdue: {
    toStatus:     'honoree',
    title:        'Déclarer le retour du véhicule',
    description:  'Le dossier passe en "Honorée" — retour déclaré manuellement. Cette action est auditée.',
    noteRequired: true,
    btnLabel:     'Confirmer le retour',
    btnColor:     'bg-red-600 hover:bg-red-700',
    icon:         <CheckCheck className="w-4 h-4" />,
  },
  litige_degat: {
    toStatus:     'honoree',
    title:        'Résoudre le sinistre',
    description:  'Le litige est résolu — dossier remis en "Honorée". Cette action est auditée.',
    noteRequired: true,
    btnLabel:     'Confirmer la résolution',
    btnColor:     'bg-red-600 hover:bg-red-700',
    icon:         <CheckCheck className="w-4 h-4" />,
  },
  transfert_valide: {
    toStatus:     'envoyee',
    title:        'Débloquer le transfert',
    description:  'Le dossier retourne en "Envoyée" — relance du processus d\'acceptation.',
    noteRequired: false,
    btnLabel:     'Débloquer',
    btnColor:     'bg-amber-500 hover:bg-amber-600',
    icon:         <ArrowRightLeft className="w-4 h-4" />,
  },
}

// ── Panel : résolution statut ──────────────────────────────────────────────────

function ResolvePanel({
  request,
  onSuccess,
}: {
  request:   AdminReservation
  onSuccess: () => void
}) {
  const cfg = RESOLVE_CONFIG[request.status]
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  if (!cfg) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500">
          Aucune résolution rapide disponible pour le statut « {request.status} ».
        </p>
        <a href={`/admin/demandes/${request.id}`} className="text-sm text-brand-600 underline mt-2 inline-block">
          Ouvrir le dossier complet
        </a>
      </div>
    )
  }

  const noteValid = !cfg.noteRequired || note.trim().length >= 10

  async function handleConfirm() {
    if (!noteValid) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/status`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ toStatus: cfg.toStatus, message: note.trim() || undefined }),
      })
      const body = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Erreur lors du changement de statut')
        return
      }
      setDone(true)
      setTimeout(onSuccess, 800)
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
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="font-bold text-slate-900">Statut mis à jour</p>
        <p className="text-sm text-slate-500">La liste se rafraîchit…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Alerte contexte */}
      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-800">{cfg.title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{cfg.description}</p>
        </div>
      </div>

      {/* Résumé dossier */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {request.status} → <span className="font-semibold text-slate-700">{cfg.toStatus}</span>
        </p>
      </div>

      {/* Note */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Note de justification {cfg.noteRequired && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder={cfg.noteRequired
            ? 'Précisez le contexte de cette action (min. 10 caractères)…'
            : 'Note optionnelle — visible dans la timeline du dossier'}
          className={`border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 transition-colors ${
            cfg.noteRequired && note.length > 0 && !noteValid
              ? 'border-red-300 focus:ring-red-300 focus:border-red-400'
              : 'border-slate-200 focus:ring-brand-400/30 focus:border-brand-400'
          }`}
        />
        {cfg.noteRequired && (
          <p className={`text-xs mt-0.5 ${noteValid ? 'text-slate-400' : 'text-red-500'}`}>
            {note.trim().length < 10
              ? `${10 - note.trim().length} caractères minimum`
              : 'Note valide'}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading || !noteValid}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-60 ${cfg.btnColor}`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : cfg.icon}
          {cfg.btnLabel}
        </button>
        <a
          href={`/admin/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Panel : relance loueur ────────────────────────────────────────────────────

function RelancePanel({
  request,
  onSuccess,
}: {
  request:   AdminReservation
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)
  const [waitMin, setWaitMin] = useState<number | null>(null)

  // Anti-spam local (uniquement admin_relance pour la route admin)
  const lastRelance = [...(request.timeline ?? [])]
    .filter(e => e.type === 'admin_relance')
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]

  const minutesSinceLast = lastRelance
    ? (Date.now() - new Date(lastRelance.at).getTime()) / 60000
    : null

  const isSpamBlocked = minutesSinceLast !== null && minutesSinceLast < 30

  const agencyCount = [
    ...(request.assignedAgencyIds ?? []),
    ...(request.assignedAgencyId ? [request.assignedAgencyId] : []),
  ].filter(Boolean).length

  async function handleRelance() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/relance`, { method: 'POST' })
      const body = await res.json() as { ok?: boolean; error?: string; minutesRemaining?: number }
      if (!res.ok) {
        if (res.status === 429 && body.minutesRemaining) setWaitMin(body.minutesRemaining)
        setError(body.error ?? 'Erreur lors de la relance')
        return
      }
      setDone(true)
      setTimeout(onSuccess, 800)
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

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {agencyCount} loueur{agencyCount > 1 ? 's' : ''} assigné{agencyCount > 1 ? 's' : ''}
        </p>
      </div>

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
          href={`/admin/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Panel : note interne ──────────────────────────────────────────────────────

function NotePanel({
  request,
  onSuccess,
}: {
  request:   AdminReservation
  onSuccess: () => void
}) {
  const originalNote = request.adminNotes ?? ''
  const [note,        setNote]        = useState(originalNote)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [done,        setDone]        = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  async function handleSave() {
    setError(null)

    // Confirmation si une note existante est effacée
    if (originalNote.trim().length > 0 && note.trim().length === 0 && !confirmClear) {
      setConfirmClear(true)
      return
    }

    setLoading(true)
    try {
      const ok = await saveAdminNote(request.id, note.trim())
      if (!ok) {
        setError('Erreur lors de la sauvegarde — vérifiez votre session.')
        return
      }
      setDone(true)
      setTimeout(onSuccess, 800)
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
          <StickyNote className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="font-bold text-slate-900">Note enregistrée</p>
        <p className="text-sm text-slate-500">La note interne a été mise à jour.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Note interne — visible équipe admin uniquement
        </label>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); setConfirmClear(false) }}
          rows={5}
          placeholder="Commentaire interne, contexte particulier, suivi manuel…"
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
        />
        <p className="text-xs text-slate-400 mt-0.5">
          {note.trim().length} caractères
        </p>
      </div>

      {confirmClear && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-semibold text-amber-800">Supprimer la note existante ?</p>
          <p className="text-xs text-amber-700 mt-0.5">
            La note actuelle sera effacée définitivement. Cliquez à nouveau sur "Enregistrer" pour confirmer.
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
          onClick={handleSave}
          disabled={loading || note === originalNote}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
          {confirmClear ? 'Confirmer la suppression' : 'Enregistrer'}
        </button>
        <a
          href={`/admin/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Panel : flags ─────────────────────────────────────────────────────────────

type FlagKey = 'litigieux' | 'anomalie' | 'prioritaire'

const FLAG_CONFIG: Record<FlagKey, { label: string; idle: string; active: string }> = {
  litigieux:   { label: 'Litigieux',   idle: 'border-red-200    text-red-500',    active: 'bg-red-600    text-white border-red-600'    },
  anomalie:    { label: 'Anomalie',    idle: 'border-orange-200 text-orange-500', active: 'bg-orange-500 text-white border-orange-500' },
  prioritaire: { label: 'Prioritaire', idle: 'border-amber-200  text-amber-600',  active: 'bg-amber-500  text-white border-amber-500'  },
}

const ALL_FLAGS: FlagKey[] = ['litigieux', 'anomalie', 'prioritaire']

function FlagsPanel({
  request,
  onSuccess,
}: {
  request:   AdminReservation
  onSuccess: () => void
}) {
  const [flags,   setFlags]   = useState<Set<FlagKey>>(
    new Set((request.adminFlags ?? []) as FlagKey[])
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  const originalFlags = new Set((request.adminFlags ?? []) as FlagKey[])
  const hasChanged = ALL_FLAGS.some(f => flags.has(f) !== originalFlags.has(f))

  function toggle(flag: FlagKey) {
    setFlags(prev => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else                next.add(flag)
      return next
    })
  }

  async function handleSave() {
    setError(null)
    setLoading(true)
    try {
      const ok = await saveAdminFlags(request.id, [...flags])
      if (!ok) {
        setError('Erreur lors de la sauvegarde — vérifiez votre session.')
        return
      }
      setDone(true)
      setTimeout(onSuccess, 800)
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
          <Flag className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="font-bold text-slate-900">Flags mis à jour</p>
        <p className="text-sm text-slate-500">La liste se rafraîchit…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Flags dossier</p>
        <div className="flex gap-2 flex-wrap">
          {ALL_FLAGS.map(flag => {
            const isActive = flags.has(flag)
            const cfg = FLAG_CONFIG[flag]
            return (
              <button
                key={flag}
                onClick={() => toggle(flag)}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  isActive ? cfg.active : cfg.idle
                }`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Cliquez pour activer ou désactiver un flag. Cliquez "Enregistrer" pour confirmer.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !hasChanged}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
          Enregistrer les flags
        </button>
        <a
          href={`/admin/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Panel : documents (lecture seule) ─────────────────────────────────────────

const CRITICAL_DOC_TYPES = ['prise_en_charge', 'contrat', 'facture', 'etat_retour'] as const

function DocsPanel({ request }: { request: AdminReservation }) {
  const [docs,        setDocs]        = useState<RequestDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)

  useEffect(() => {
    getDocumentsByRequest(request.id).then(d => {
      setDocs(d)
      setLoadingDocs(false)
    })
  }, [request.id])

  const criticalDocs = CRITICAL_DOC_TYPES.map(type => ({
    type,
    label:     REQUEST_DOCUMENT_TYPE_LABELS[type],
    colorCls:  REQUEST_DOCUMENT_TYPE_COLORS[type],
    documents: docs.filter(d => d.type === type),
  }))

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
      </div>

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
                  {documents.slice(0, 2).map(doc =>
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
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Manquant</span>
              )}
            </div>
          ))
        )}
      </div>

      <a
        href={`/admin/demandes/${request.id}`}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Tous les documents du dossier
      </a>
    </div>
  )
}

// ── Panel : finance — mark_ready uniquement ───────────────────────────────────

function FinancePanel({
  request,
  onSuccess,
}: {
  request:   AdminReservation
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  async function handleMarkReady() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/finance`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'mark_ready' }),
      })
      const body = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) {
        if (res.status === 422) {
          setError('Recalcul des montants nécessaire avant validation — ouvrez le dossier complet pour effectuer cette opération.')
        } else {
          setError(body.error ?? 'Erreur lors de la validation')
        }
        return
      }
      setDone(true)
      setTimeout(onSuccess, 800)
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
          <CreditCard className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="font-bold text-slate-900">Dossier prêt à payer</p>
        <p className="text-sm text-slate-500">Le statut paiement a été mis à jour.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
        <CreditCard className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-violet-800">Marquer prêt à payer</p>
          <p className="text-xs text-violet-700 mt-0.5">
            Le dossier passe en statut "Prêt à payer". Le paiement définitif devra être confirmé dans le dossier complet.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Statut paiement : <span className="font-semibold text-violet-700">{request.paymentStatus}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
          {error.includes('Recalcul') && (
            <a
              href={`/admin/demandes/${request.id}`}
              className="text-sm font-semibold text-red-800 underline mt-1 inline-block"
            >
              Ouvrir le dossier complet →
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleMarkReady}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Confirmer — prêt à payer
        </button>
        <a
          href={`/admin/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Drawer principal ──────────────────────────────────────────────────────────

const DRAWER_TITLES: Record<AdminDrawerMode, string> = {
  resolve: 'Résoudre le dossier',
  relance: 'Relancer les loueurs',
  note:    'Note interne',
  flags:   'Flags du dossier',
  docs:    'Documents clés',
  finance: 'Validation paiement',
}

export function AdminOperationsDrawer({ state, onClose, onSuccess }: Props) {
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
          {state?.mode === 'resolve'  && <ResolvePanel  request={state.request} onSuccess={onSuccess} />}
          {state?.mode === 'relance'  && <RelancePanel  request={state.request} onSuccess={onSuccess} />}
          {state?.mode === 'note'     && <NotePanel     request={state.request} onSuccess={onSuccess} />}
          {state?.mode === 'flags'    && <FlagsPanel    request={state.request} onSuccess={onSuccess} />}
          {state?.mode === 'docs'     && <DocsPanel     request={state.request} />}
          {state?.mode === 'finance'  && <FinancePanel  request={state.request} onSuccess={onSuccess} />}
        </div>
      </div>
    </>
  )
}
