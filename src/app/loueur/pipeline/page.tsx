'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, addDays }                      from 'date-fns'
import { fr }                                   from 'date-fns/locale'
import {
  RefreshCw, Search, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'
import { RentalRequestCard }       from '@/components/loueur/RentalRequestCard'
import { LoueurOperationsDrawer }  from '@/components/loueur/LoueurOperationsDrawer'
import type { DrawerState }        from '@/components/loueur/LoueurOperationsDrawer'
import { getMyAgencies, type RentalAgencyRow } from '@/services/rentalAgencyService'
import { getReceivedRequests }     from '@/services/loueurService'
import { getSession }              from '@/services/currentSessionService'
import { getEndDate }              from '@/lib/rentalDates'
import { getDisplayStatus, type DisplayStatusType } from '@/lib/displayStatus'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { ReceivedRequest }    from '@/types/loueur'
import type { MockSession }        from '@/types/session'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'toutes' | DisplayStatusType

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'toutes',              label: 'Toutes'     },
  { key: 'en_attente',          label: 'En attente' },
  { key: 'confirmee',           label: 'Confirmée'  },
  { key: 'en_cours',            label: 'En cours'   },
  { key: 'en_attente_paiement', label: 'Paiement'   },
  { key: 'cloturee',            label: 'Clôturé'    },
]

function matchesTab(r: ReceivedRequest, tab: FilterTab): boolean {
  if (tab === 'toutes') return true
  return getDisplayStatus(r.status, r.dateNeeded) === tab
}

// ── Kanban config ─────────────────────────────────────────────────────────────

type KanbanCol = {
  key:    string
  label:  string
  color:  string
  accent: string
  bg:     string
  match:  (r: ReceivedRequest) => boolean
}

const KANBAN_COLS: KanbanCol[] = [
  {
    key:    'nouvelles',
    label:  'Nouvelles',
    color:  'text-blue-700',
    accent: 'bg-blue-500',
    bg:     'bg-blue-50',
    match:  r => ['envoyee', 'recue'].includes(r.status),
  },
  {
    key:    'confirmees',
    label:  'À préparer',
    color:  'text-indigo-700',
    accent: 'bg-indigo-500',
    bg:     'bg-indigo-50',
    match:  r => r.status === 'confirmee' && new Date(r.dateNeeded) > new Date(),
  },
  {
    key:    'en_cours',
    label:  'En location',
    color:  'text-emerald-700',
    accent: 'bg-emerald-500',
    bg:     'bg-emerald-50',
    match:  r =>
      r.status === 'confirmee' &&
      new Date(r.dateNeeded) <= new Date() &&
      getEndDate(r) > addDays(new Date(), 1),
  },
  {
    key:    'retours',
    label:  'Retours',
    color:  'text-orange-700',
    accent: 'bg-orange-500',
    bg:     'bg-orange-50',
    match:  r =>
      r.status === 'overdue' ||
      (r.status === 'confirmee' && getEndDate(r) <= addDays(new Date(), 1)),
  },
  {
    key:    'a_cloturer',
    label:  'À clôturer',
    color:  'text-violet-700',
    accent: 'bg-violet-500',
    bg:     'bg-violet-50',
    match:  r => r.status === 'honoree',
  },
]

// ── Kanban card ───────────────────────────────────────────────────────────────

const KANBAN_TAB_HINTS: Record<string, string> = {
  retours:    'retour',
  a_cloturer: 'finance',
}

function KanbanCard({
  request,
  col,
  onAction,
}: {
  request:  ReceivedRequest
  col:      KanbanCol
  onAction: (r: ReceivedRequest, kind: 'repondre' | 'retour') => void
}) {
  const vehicle  = VEHICLE_CATEGORY_LABELS[request.vehicleCategory] ?? request.vehicleCategory
  const endDate  = getEndDate(request)
  const isReturn = col.key === 'retours'
  const isNew    = col.key === 'nouvelles'
  const tabHint  = KANBAN_TAB_HINTS[col.key]
  const href     = tabHint ? `/loueur/demandes/${request.id}?tab=${tabHint}` : `/loueur/demandes/${request.id}`

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-xs font-mono text-slate-400 leading-none">{request.dossierNumber}</p>
          <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">
            {request.sinistre.lastName} {request.sinistre.firstName}
          </p>
        </div>
        <a
          href={href}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <p className="text-xs text-slate-500 truncate">{vehicle}</p>

      {isReturn && (
        <p className="text-xs text-orange-600 font-semibold">
          Retour : {format(endDate, 'd MMM', { locale: fr })}
          {request.status === 'overdue' && ' · Dépassé'}
        </p>
      )}

      {(isReturn || isNew) && (
        <button
          onClick={() => onAction(request, isReturn ? 'retour' : 'repondre')}
          className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
            isReturn
              ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isReturn ? 'Confirmer retour' : 'Répondre'}
        </button>
      )}

      {col.key === 'a_cloturer' && (
        <a
          href={`/loueur/demandes/${request.id}?tab=finance`}
          className="w-full py-1.5 rounded-lg text-xs font-bold text-center bg-violet-100 hover:bg-violet-200 text-violet-700 transition-colors"
        >
          Voir le dossier
        </a>
      )}
    </div>
  )
}

// ── Kanban pipeline ───────────────────────────────────────────────────────────

function KanbanPipeline({
  requests,
  onAction,
}: {
  requests: ReceivedRequest[]
  onAction: (r: ReceivedRequest, mode: 'repondre' | 'retour') => void
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="flex gap-3 min-w-max">
        {KANBAN_COLS.map(col => {
          const cards = requests.filter(col.match)
          return (
            <div key={col.key} className="w-52 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                <span className="ml-auto text-xs font-bold text-slate-400 tabular-nums">{cards.length}</span>
              </div>

              <div className="flex flex-col gap-2">
                {cards.slice(0, 5).map(r => (
                  <KanbanCard key={r.id} request={r} col={col} onAction={onAction} />
                ))}
                {cards.length > 5 && (
                  <p className="text-xs text-slate-400 text-center py-1">
                    +{cards.length - 5} autres
                  </p>
                )}
                {cards.length === 0 && (
                  <div className={`rounded-xl border border-dashed border-slate-200 ${col.bg}/30 py-6 flex items-center justify-center`}>
                    <span className="text-xs text-slate-300">Aucun</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function LoueurPipelinePage() {
  const [requests,    setRequests]   = useState<ReceivedRequest[]>([])
  const [session,     setSession]    = useState<MockSession | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [refreshing,  setRefreshing] = useState(false)
  const [drawer,      setDrawer]     = useState<DrawerState | null>(null)
  const [dossierOpen, setDossierOpen] = useState(false)
  const [search,      setSearch]     = useState('')
  const [tab,         setTab]        = useState<FilterTab>('toutes')
  const agenciesRef = useRef<RentalAgencyRow[]>([])

  async function load(agencies: RentalAgencyRow[]) {
    const received = await getReceivedRequests(agencies)
    setRequests(received)
  }

  useEffect(() => {
    setSession(getSession())
    getMyAgencies().then(async myAgencies => {
      agenciesRef.current = myAgencies
      await load(myAgencies)
      setLoading(false)
    })
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await load(agenciesRef.current)
    setRefreshing(false)
  }

  function handleRequestUpdate(updated: ReceivedRequest) {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const today = format(new Date(), "EEEE d MMMM", { locale: fr })

  const visible = useMemo(() =>
    requests.filter(r => !(r.confirmedAgencyId && r.confirmedAgencyId !== r.agencyId)),
    [requests]
  )

  const filtered = useMemo(() => {
    return visible.filter(r => {
      if (!matchesTab(r, tab)) return false
      const q = search.toLowerCase()
      return !q
        || r.dossierNumber.toLowerCase().includes(q)
        || r.sinistre.lastName.toLowerCase().includes(q)
        || r.sinistre.firstName.toLowerCase().includes(q)
        || r.location.address.toLowerCase().includes(q)
    })
  }, [visible, tab, search])

  const tabCount = (key: FilterTab) =>
    key === 'toutes' ? visible.length : visible.filter(r => matchesTab(r, key)).length

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1 capitalize">{today}</p>
            <h1 className="text-2xl font-black text-slate-900">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {session?.company ?? 'Vue complète de vos dossiers'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 mt-1"
            aria-label="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Kanban */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Pipeline ({visible.length})
          </h2>
          <KanbanPipeline requests={visible} onAction={(r, mode) => setDrawer({ request: r, mode })} />
        </section>

        {/* Tous les dossiers (collapsible) */}
        <section>
          <button
            onClick={() => setDossierOpen(o => !o)}
            className="flex items-center gap-2 w-full text-left mb-3 group"
          >
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider group-hover:text-brand-600 transition-colors">
              Tous les dossiers
            </h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full tabular-nums">
              {visible.length}
            </span>
            <span className="ml-auto text-slate-400 group-hover:text-slate-600 transition-colors">
              {dossierOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {dossierOpen && (
            <div className="flex flex-col gap-4">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Rechercher une demande"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Dossier, sinistré, adresse…"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                />
              </div>

              {/* Tabs */}
              <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200">
                {TABS.map(t => {
                  const count  = tabCount(t.key)
                  const active = tab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={[
                        'shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap',
                        active
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {t.label}
                      <span className={[
                        'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center tabular-nums',
                        active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Cards */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center gap-3">
                  <Search className="w-7 h-7 text-slate-300" />
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">
                      {search ? 'Aucun résultat' : 'Aucune demande dans cette catégorie'}
                    </p>
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="text-sm font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2 mt-2"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map(r => <RentalRequestCard key={r.id} request={r} />)}
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      <LoueurOperationsDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onSuccess={updated => {
          handleRequestUpdate(updated)
          setDrawer(null)
        }}
      />
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-52 shrink-0 flex flex-col gap-2 animate-pulse">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          {[...Array(2)].map((_, j) => (
            <div key={j} className="rounded-xl border border-slate-100 bg-white p-3 space-y-2">
              <div className="h-3 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
