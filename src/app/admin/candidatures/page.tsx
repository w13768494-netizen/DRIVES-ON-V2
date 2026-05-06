'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Building2, User, Phone, Mail, Globe, Truck, ShieldCheck,
  BarChart2, Layers, Loader2,
} from 'lucide-react'
import {
  getCandidatures,
  reviewCandidature,
} from '@/services/candidatureService'
import {
  Candidature,
  CandidatureRole,
  CandidatureStatus,
  CANDIDATURE_ROLE_LABELS,
  CANDIDATURE_STATUS_LABELS,
  CANDIDATURE_STATUS_STYLES,
  VEHICLE_TYPE_OPTIONS,
  MONTHLY_VOLUME_OPTIONS,
} from '@/types/candidature'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type FilterTab = 'toutes' | CandidatureStatus | CandidatureRole

const vehicleLabel = (v: string) =>
  VEHICLE_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v

const volumeLabel = (n?: number) =>
  n !== undefined ? (MONTHLY_VOLUME_OPTIONS.find(o => o.value === n)?.label ?? `${n} dossiers / mois`) : '—'

function StatusBadge({ status }: { status: CandidatureStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${CANDIDATURE_STATUS_STYLES[status]}`}>
      {status === 'en_attente' && <Clock className="w-3 h-3" />}
      {status === 'acceptee'   && <CheckCircle2 className="w-3 h-3" />}
      {status === 'refusee'    && <XCircle className="w-3 h-3" />}
      {CANDIDATURE_STATUS_LABELS[status]}
    </span>
  )
}

function RoleBadge({ role }: { role: CandidatureRole }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
      role === 'assisteur'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-orange-50 text-orange-700 border-orange-200'
    }`}>
      {role === 'assisteur' ? <ShieldCheck className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
      {CANDIDATURE_ROLE_LABELS[role]}
    </span>
  )
}

function CandidatureCard({ c, onReview }: { c: Candidature; onReview: () => void }) {
  const [expanded, setExpanded]     = useState(false)
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState<'acceptee' | 'refusee' | null>(null)
  const [localStatus, setLocalStatus] = useState<CandidatureStatus>(c.status)
  const [localNote, setLocalNote]   = useState(c.reviewNote)

  async function handleReview(status: 'acceptee' | 'refusee') {
    setLoading(status)
    await reviewCandidature(c.id, status, note || undefined)
    setLocalStatus(status)
    setLocalNote(note || undefined)
    setLoading(null)
    onReview()
  }

  const pending = localStatus === 'en_attente'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      localStatus === 'acceptee' ? 'border-green-200' : localStatus === 'refusee' ? 'border-red-200' : 'border-slate-200'
    }`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-900">{c.companyName}</span>
            <RoleBadge role={c.role} />
            <StatusBadge status={localStatus} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {c.contactFirstName} {c.contactLastName} · {c.city} ({c.postalCode}) ·{' '}
            Soumis le {format(c.submittedAt, 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
            {/* Entreprise */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> Entreprise
              </p>
              <dl className="space-y-1">
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-500">SIRET</dt>
                  <dd className="font-mono text-slate-700">{c.siret}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-500">Adresse</dt>
                  <dd className="text-slate-700 text-right">{c.address}, {c.postalCode} {c.city}</dd>
                </div>
                {c.website && (
                  <div className="flex justify-between text-xs">
                    <dt className="text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" /> Site</dt>
                    <dd>
                      <a href={c.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate max-w-[160px] block text-right">
                        {c.website.replace(/^https?:\/\//, '')}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Contact
              </p>
              <dl className="space-y-1">
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-500">Nom</dt>
                  <dd className="text-slate-700">{c.contactFirstName} {c.contactLastName}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-500">Fonction</dt>
                  <dd className="text-slate-700">{c.contactTitle}</dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</dt>
                  <dd>
                    <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a>
                  </dd>
                </div>
                <div className="flex justify-between text-xs">
                  <dt className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Tél.</dt>
                  <dd className="text-slate-700">{c.phone}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Spécifique au rôle */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            {c.role === 'assisteur' && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <BarChart2 className="w-3 h-3" /> Volume estimé
                </p>
                <p className="text-sm font-semibold text-slate-800">{volumeLabel(c.monthlyVolume)}</p>
              </>
            )}
            {c.role === 'loueur' && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Flotte
                </p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">Agences</span>
                    <p className="font-bold text-slate-800">{c.agencyCount ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Véhicules</span>
                    <p className="font-bold text-slate-800">{c.fleetSize ?? '—'}</p>
                  </div>
                </div>
                {c.vehicleTypes && c.vehicleTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.vehicleTypes.map(v => (
                      <span key={v} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-medium">
                        {vehicleLabel(v)}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {c.message && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Message</p>
              <p className="text-xs text-slate-600 leading-relaxed">{c.message}</p>
            </div>
          )}

          {/* Review section */}
          {pending ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Note interne (optionnelle)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ex : Dossier complet, volume cohérent. Bienvenue sur Drives On !"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all resize-none"
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => handleReview('acceptee')}
                  disabled={loading !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                >
                  {loading === 'acceptee'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />
                  }
                  Accepter
                </button>
                <button
                  onClick={() => handleReview('refusee')}
                  disabled={loading !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-semibold disabled:opacity-60 transition-colors"
                >
                  {loading === 'refusee'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />
                  }
                  Refuser
                </button>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl px-4 py-3 text-xs border ${CANDIDATURE_STATUS_STYLES[localStatus]}`}>
              <p className="font-semibold mb-0.5">
                {localStatus === 'acceptee' ? 'Candidature acceptée' : 'Candidature refusée'}{' '}
                {c.reviewedAt ? `· ${format(c.reviewedAt, 'd MMM yyyy', { locale: fr })}` : ''}
              </p>
              {localNote && <p className="opacity-80">{localNote}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'toutes',     label: 'Toutes'     },
  { key: 'en_attente', label: 'En attente' },
  { key: 'assisteur',  label: 'Assisteurs' },
  { key: 'loueur',     label: 'Loueurs'    },
  { key: 'acceptee',   label: 'Acceptées'  },
  { key: 'refusee',    label: 'Refusées'   },
]

export default function AdminCandidaturesPage() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState<FilterTab>('toutes')

  async function load() {
    setLoading(true)
    const data = await getCandidatures()
    setCandidatures(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = candidatures.filter(c => {
    if (tab === 'toutes')     return true
    if (tab === 'assisteur' || tab === 'loueur') return c.role === tab
    return c.status === tab
  })

  const pending = candidatures.filter(c => c.status === 'en_attente').length

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-10 gap-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Candidatures</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {candidatures.length} dossier{candidatures.length > 1 ? 's' : ''} au total
            {pending > 0 && <> · <span className="text-amber-600 font-semibold">{pending} en attente</span></>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.key === 'en_attente' && pending > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-slate-400 text-sm font-medium">Aucune candidature dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <CandidatureCard key={c.id} c={c} onReview={load} />
          ))}
        </div>
      )}
    </div>
  )
}
