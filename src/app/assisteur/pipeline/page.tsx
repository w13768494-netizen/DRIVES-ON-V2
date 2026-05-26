'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link                from 'next/link'
import { format, addDays } from 'date-fns'
import { fr }              from 'date-fns/locale'
import {
  Search, Users, User, AlertTriangle, CreditCard, Clock,
  ChevronDown, ChevronUp, RefreshCw, ExternalLink, CheckCircle2,
  Bell, CalendarPlus, FileWarning, Building2, CalendarDays, X, ChevronRight,
} from 'lucide-react'
import { getAllRequests }                from '@/services/requestService'
import { getAllUsers, filterRequestsForUser } from '@/services/assistanceUserService'
import { getSession }                   from '@/services/currentSessionService'
import { RequestCard }                  from '@/components/assisteur/RequestCard'
import { AssisteurOperationsDrawer }    from '@/components/assisteur/AssisteurOperationsDrawer'
import type { AssisteurDrawerState }    from '@/components/assisteur/AssisteurOperationsDrawer'
import { getRentalAlertState, getEndDate } from '@/lib/rentalDates'
import { getDisplayStatus, type DisplayStatusType } from '@/lib/displayStatus'
import { VEHICLE_CATEGORY_LABELS }      from '@/types/vehicleCategory'
import {
  computeOperationalFlags, relativeTime, PRIORITY_COLORS,
} from '@/lib/operationalPriority'
import { getEffectiveDuration }         from '@/types/request'
import type { AssistanceRequest }       from '@/types/request'
import type { AccountType, MockSession } from '@/types/session'
import type { AssistanceUser }          from '@/types/assistanceUser'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'toutes' | DisplayStatusType | 'overdue' | 'transfert'
type Scope     = 'mine' | 'team'

const TABS: { id: FilterTab; label: string; alert?: boolean; alertColor?: 'red' | 'orange' }[] = [
  { id: 'toutes',              label: 'Toutes'           },
  { id: 'en_attente',          label: 'En attente'       },
  { id: 'confirmee',           label: 'Confirmée'        },
  { id: 'en_cours',            label: 'En cours'         },
  { id: 'overdue',             label: 'Overdue',   alert: true, alertColor: 'red'    },
  { id: 'transfert',           label: 'Transferts', alert: true, alertColor: 'orange' },
  { id: 'en_attente_paiement', label: 'Paiement'         },
  { id: 'cloturee',            label: 'Clôturé'          },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
}

function fmtDate(d: Date): string {
  return format(d, 'd MMM', { locale: fr })
}

function endDateOf(r: AssistanceRequest): Date {
  return addDays(new Date(r.dateNeeded), getEffectiveDuration(r))
}

function todayISODate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Kanban config ─────────────────────────────────────────────────────────────

type PipelineCol = {
  key:    string
  label:  string
  color:  string
  accent: string
  bg:     string
  match:  (r: AssistanceRequest) => boolean
}

const COL_TAB_HINTS: Record<string, string> = {
  retour:     'retour',
  a_cloturer: 'finance',
}

function getPipelineCols(accountType?: AccountType): PipelineCol[] {
  if (accountType === 'garage') {
    return [
      { key: 'immobilises',   label: 'Immobilisés',    color: 'text-amber-700',   accent: 'bg-amber-500',   bg: 'bg-amber-50',
        match: r => ['envoyee', 'recue', 'brouillon'].includes(r.status) },
      { key: 'en_reparation', label: 'En réparation',  color: 'text-orange-700',  accent: 'bg-orange-500',  bg: 'bg-orange-50',
        match: r => r.status === 'confirmee' && new Date(r.dateNeeded) <= new Date() && getEndDate(r) > addDays(new Date(), 1) },
      { key: 'clients_reloges', label: 'Clients relogés', color: 'text-emerald-700', accent: 'bg-emerald-500', bg: 'bg-emerald-50',
        match: r => r.status === 'confirmee' && new Date(r.dateNeeded) > new Date() },
      { key: 'retour',        label: 'Retour prévu',   color: 'text-red-700',     accent: 'bg-red-500',     bg: 'bg-red-50',
        match: r => r.status === 'overdue' || (r.status === 'confirmee' && getEndDate(r) <= addDays(new Date(), 1)) },
      { key: 'a_cloturer',    label: 'À clôturer',     color: 'text-slate-700',   accent: 'bg-slate-400',   bg: 'bg-slate-50',
        match: r => r.status === 'honoree' },
    ]
  }
  return [
    { key: 'nouvelles',   label: 'Nouvelles',       color: 'text-blue-700',    accent: 'bg-blue-500',    bg: 'bg-blue-50',
      match: r => ['brouillon', 'envoyee', 'recue'].includes(r.status) },
    { key: 'confirmees',  label: 'Loueur trouvé',   color: 'text-indigo-700',  accent: 'bg-indigo-500',  bg: 'bg-indigo-50',
      match: r => r.status === 'confirmee' && new Date(r.dateNeeded) > new Date() },
    { key: 'en_location', label: 'En location',     color: 'text-emerald-700', accent: 'bg-emerald-500', bg: 'bg-emerald-50',
      match: r => r.status === 'confirmee' && new Date(r.dateNeeded) <= new Date() && getEndDate(r) > addDays(new Date(), 1) },
    { key: 'retour',      label: 'Retour / Overdue', color: 'text-orange-700', accent: 'bg-orange-500',  bg: 'bg-orange-50',
      match: r => r.status === 'overdue' || (r.status === 'confirmee' && getEndDate(r) <= addDays(new Date(), 1)) },
    { key: 'a_cloturer',  label: 'À clôturer',      color: 'text-violet-700',  accent: 'bg-violet-500',  bg: 'bg-violet-50',
      match: r => r.status === 'honoree' },
  ]
}

// ── KanbanMiniCard ────────────────────────────────────────────────────────────

function KanbanMiniCard({ r, tabHint }: { r: AssistanceRequest; tabHint?: string }) {
  const vehicle   = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory
  const isOverdue = getRentalAlertState(r) === 'overdue' || r.status === 'overdue'
  const href      = tabHint ? `/assisteur/demandes/${r.id}?tab=${tabHint}` : `/assisteur/demandes/${r.id}`

  return (
    <a
      href={href}
      className={`block rounded-xl border bg-white p-3 hover:shadow-md transition-shadow ${
        isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-xs font-mono text-slate-400 truncate leading-none">{r.dossierNumber}</p>
        <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />
      </div>
      <p className="text-sm font-semibold text-slate-800 truncate">
        {r.sinistre.firstName} {r.sinistre.lastName}
      </p>
      <p className="text-xs text-slate-500 truncate mt-0.5">{vehicle} · {r.durationDays}j</p>
      {isOverdue && <p className="text-xs font-bold text-red-600 mt-1">Overdue</p>}
    </a>
  )
}

// ── KanbanPipeline ────────────────────────────────────────────────────────────

function KanbanPipeline({ requests, accountType }: { requests: AssistanceRequest[]; accountType?: AccountType }) {
  const cols = useMemo(() => getPipelineCols(accountType), [accountType])

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="flex gap-3 min-w-max">
        {cols.map(col => {
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
                  <KanbanMiniCard key={r.id} r={r} tabHint={COL_TAB_HINTS[col.key]} />
                ))}
                {cards.length > 5 && (
                  <p className="text-xs text-slate-400 text-center py-1">+{cards.length - 5} autres</p>
                )}
                {cards.length === 0 && (
                  <div className={`rounded-xl border border-dashed border-slate-200 py-6 flex items-center justify-center ${col.bg}/30`}>
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

// ── UrgSection ────────────────────────────────────────────────────────────────

function UrgSection({
  icon, label, count, color, pulse, children,
}: {
  icon: React.ReactNode; label: string; count: number; color: string; pulse?: boolean; children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
          {icon}{label}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
          pulse ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

// ── OpCard ────────────────────────────────────────────────────────────────────

function OpCard({ r, hint, accent }: { r: AssistanceRequest; hint: string; accent: string }) {
  const flags   = computeOperationalFlags(r)
  const colors  = PRIORITY_COLORS[flags.priority]
  const vehicle = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory

  return (
    <Link
      href={`/assisteur/demandes/${r.id}`}
      className={`flex items-stretch rounded-xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-px ${colors.border} ${colors.bg}`}
    >
      <div className={`w-1 shrink-0 ${accent}`} />
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-mono text-xs text-slate-400 shrink-0">{r.dossierNumber}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>{hint}</span>
        </div>
        <p className="font-semibold text-slate-900 text-sm truncate">{r.sinistre.lastName} {r.sinistre.firstName}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{vehicle} · {r.location.address}</p>
        {flags.deadlineLabel && (
          <p className={`text-xs font-semibold mt-1 ${colors.text}`}>{flags.deadlineLabel}</p>
        )}
      </div>
      <div className="flex items-center px-3 border-l border-slate-100 text-slate-400 shrink-0">
        <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssisteurPipelinePage() {
  const [allRequests,  setAllRequests]  = useState<AssistanceRequest[]>([])
  const [users,        setUsers]        = useState<AssistanceUser[]>([])
  const [session,      setSession]      = useState<MockSession | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [drawer,       setDrawer]       = useState<AssisteurDrawerState | null>(null)
  const [dossierOpen,  setDossierOpen]  = useState(false)
  const [tab,          setTab]          = useState<FilterTab>('toutes')
  const [search,       setSearch]       = useState('')
  const [filterDate,   setFilterDate]   = useState('')
  const [scope,        setScope]        = useState<Scope>('mine')
  const [filterUserId, setFilterUserId] = useState<string>('all')

  const canSeeTeam  = session?.companyRole === 'admin' || session?.companyRole === 'superviseur'
  const accountType = session?.accountType

  const load = useCallback(async () => {
    const [reqs, usrs] = await Promise.all([getAllRequests(), Promise.resolve(getAllUsers())])
    setAllRequests(reqs)
    setUsers(usrs)
  }, [])

  useEffect(() => {
    const s = getSession()
    setSession(s)
    load().then(() => setLoading(false))
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const scopedRequests = useMemo(() => {
    if (!session) return allRequests
    const role = session.companyRole
    if (!role) return allRequests
    if (scope === 'mine' || !canSeeTeam) return filterRequestsForUser(allRequests, session.userId, role)
    if (filterUserId !== 'all') return allRequests.filter(r => r.createdByUserId === filterUserId)
    return allRequests
  }, [allRequests, session, scope, canSeeTeam, filterUserId])

  const now = useMemo(() => new Date(), [])

  // Urgency categorization
  const overdue    = scopedRequests.filter(r => r.status === 'overdue')
  const litiges    = scopedRequests.filter(r => r.status === 'litige_degat')
  const urgences   = scopedRequests.filter(r =>
    r.requestType === 'immediate' &&
    ['envoyee', 'recue'].includes(r.status) &&
    minutesSince(r.createdAt) > 45
  )
  const extensions = scopedRequests.filter(r =>
    (r.extensions ?? []).some(e => e.status === 'en_attente') &&
    !['overdue', 'litige_degat', 'cloturee', 'refusee'].includes(r.status)
  )
  const sansLoueur = scopedRequests.filter(r =>
    ['envoyee', 'recue'].includes(r.status) &&
    !r.assignedAgencyId &&
    !(r.requestType === 'immediate' && minutesSince(r.createdAt) > 45)
  )
  const paiements  = scopedRequests.filter(r => r.status === 'honoree')
  const urgencyTotal = overdue.length + litiges.length + urgences.length +
                       extensions.length + sansLoueur.length + paiements.length

  // Dossiers
  const isOverdue   = (r: AssistanceRequest) => getRentalAlertState(r) === 'overdue'
  const isTransfert = (r: AssistanceRequest) => ['transfert_propose', 'transfert_valide', 'transferee'].includes(r.status)

  const dateFilteredRequests = useMemo(() => {
    if (!filterDate) return scopedRequests
    return scopedRequests.filter(r => {
      const d = new Date(r.createdAt)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === filterDate
    })
  }, [scopedRequests, filterDate])

  const filtered = useMemo(() => {
    let result: AssistanceRequest[]
    if      (tab === 'toutes')    result = dateFilteredRequests
    else if (tab === 'overdue')   result = dateFilteredRequests.filter(isOverdue)
    else if (tab === 'transfert') result = dateFilteredRequests.filter(isTransfert)
    else                          result = dateFilteredRequests.filter(r => getDisplayStatus(r.status, r.dateNeeded) === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.dossierNumber.toLowerCase().includes(q) ||
        r.sinistre.lastName.toLowerCase().includes(q) ||
        r.sinistre.firstName.toLowerCase().includes(q) ||
        r.location.address.toLowerCase().includes(q)
      )
    }
    return result
  }, [dateFilteredRequests, tab, search])

  const tabCount = (id: FilterTab) => {
    if (id === 'toutes')    return dateFilteredRequests.length
    if (id === 'overdue')   return dateFilteredRequests.filter(isOverdue).length
    if (id === 'transfert') return dateFilteredRequests.filter(isTransfert).length
    return dateFilteredRequests.filter(r => getDisplayStatus(r.status, r.dateNeeded) === id).length
  }

  function filterDateLabel() {
    if (!filterDate) return ''
    return new Date(filterDate + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const kanbanLabel = accountType === 'garage' ? 'Pipeline atelier' : 'Pipeline location'

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {urgencyTotal > 0
                ? `${urgencyTotal} action${urgencyTotal > 1 ? 's' : ''} requise${urgencyTotal > 1 ? 's' : ''}`
                : canSeeTeam && scope === 'team' ? 'Vue équipe' : (session?.company ?? 'Vue d\'ensemble')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canSeeTeam && (
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
                <ScopeBtn active={scope === 'mine'} icon={<User className="w-3.5 h-3.5" />} onClick={() => { setScope('mine'); setFilterUserId('all') }}>Moi</ScopeBtn>
                <ScopeBtn active={scope === 'team'} icon={<Users className="w-3.5 h-3.5" />} onClick={() => setScope('team')}>Équipe</ScopeBtn>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtre équipe */}
        {canSeeTeam && scope === 'team' && users.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <MemberBtn active={filterUserId === 'all'} onClick={() => setFilterUserId('all')}>
              Tous ({allRequests.length})
            </MemberBtn>
            {users.map(u => {
              const count = allRequests.filter(r => r.createdByUserId === u.id).length
              return (
                <MemberBtn key={u.id} active={filterUserId === u.id} onClick={() => setFilterUserId(u.id)}>
                  {u.firstName} {u.lastName[0]}. ({count})
                </MemberBtn>
              )
            })}
          </div>
        )}

        {/* Urgences */}
        {urgencyTotal === 0 ? (
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Tout est traité</p>
              <p className="text-xs text-slate-400 mt-0.5">Aucune action requise pour le moment.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            <UrgSection icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />} label="Overdue — retour urgent" count={overdue.length} color="bg-red-500" pulse>
              {overdue.map(r => (
                <div key={r.id} className="flex items-stretch rounded-xl border border-red-200 bg-red-50/20 overflow-hidden">
                  <div className="w-1 shrink-0 bg-red-500" />
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">OVERDUE</span>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm truncate">{r.sinistre.lastName} {r.sinistre.firstName}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.location.address}</p>
                  </div>
                  <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-red-100 shrink-0">
                    <button onClick={() => setDrawer({ request: r, mode: 'overdue' })} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors whitespace-nowrap">
                      Régulariser
                    </button>
                    <Link href={`/assisteur/demandes/${r.id}`} className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </UrgSection>

            <UrgSection icon={<FileWarning className="w-3.5 h-3.5 text-red-700" />} label="Sinistres déclarés" count={litiges.length} color="bg-red-400" pulse>
              {litiges.map(r => <OpCard key={r.id} r={r} hint="SINISTRE" accent="bg-red-400" />)}
            </UrgSection>

            <UrgSection icon={<Bell className="w-3.5 h-3.5 text-orange-600" />} label="Urgences sans réponse" count={urgences.length} color="bg-orange-500" pulse>
              {urgences.map(r => {
                const mins = minutesSince(r.createdAt)
                const timeLabel = mins >= 60
                  ? `Sans réponse depuis ${Math.floor(mins / 60)}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') : ''}`
                  : `Sans réponse depuis ${mins}min`
                const hasAgencies = !!(r.assignedAgencyId || (r.assignedAgencyIds ?? []).length > 0)
                return (
                  <div key={r.id} className="flex items-stretch rounded-xl border border-orange-200 bg-orange-50/30 overflow-hidden">
                    <div className="w-1 shrink-0 bg-orange-500" />
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200">IMMÉDIATE</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm truncate">{r.sinistre.lastName} {r.sinistre.firstName}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.location.address}</p>
                      <p className="text-xs font-semibold text-orange-700 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{timeLabel}
                      </p>
                    </div>
                    <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-orange-100 shrink-0">
                      {hasAgencies && (
                        <button onClick={() => setDrawer({ request: r, mode: 'relance' })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap">
                          <Bell className="w-3 h-3" />Relancer
                        </button>
                      )}
                      <Link href={`/assisteur/demandes/${r.id}`} className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </UrgSection>

            <UrgSection icon={<CalendarPlus className="w-3.5 h-3.5 text-amber-600" />} label="Prolongations en attente" count={extensions.length} color="bg-amber-400">
              {extensions.map(r => {
                const pendingExts = (r.extensions ?? []).filter(e => e.status === 'en_attente')
                return (
                  <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/20 overflow-hidden">
                    <div className="flex items-stretch">
                      <div className="w-1 shrink-0 bg-amber-400" />
                      <div className="flex-1 px-4 py-3 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                            {pendingExts.length} prolongation{pendingExts.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 text-sm truncate">{r.sinistre.lastName} {r.sinistre.firstName}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.location.address}</p>
                      </div>
                      <Link href={`/assisteur/demandes/${r.id}`} className="flex items-center px-3 border-l border-amber-100 text-slate-400 hover:text-slate-700 shrink-0 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                    <div className="border-t border-amber-100 px-4 py-2 flex flex-col gap-2">
                      {pendingExts.map(ext => (
                        <div key={ext.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-amber-800">+{ext.requestedDays} jour{ext.requestedDays > 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 shrink-0 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />En attente du loueur
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </UrgSection>

            <UrgSection icon={<Building2 className="w-3.5 h-3.5 text-slate-500" />} label="Sans loueur assigné" count={sansLoueur.length} color="bg-slate-400">
              {sansLoueur.map(r => (
                <div key={r.id} className="flex items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="w-1 shrink-0 bg-slate-300" />
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                        {r.requestType === 'immediate' ? 'IMMÉDIATE' : 'Planifiée'}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm truncate">{r.sinistre.lastName} {r.sinistre.firstName}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.durationDays}j · {fmtDate(new Date(r.dateNeeded))}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">{relativeTime(r.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-slate-100 shrink-0">
                    <button onClick={() => setDrawer({ request: r, mode: 'relance' })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap">
                      <Bell className="w-3 h-3" />Relancer
                    </button>
                    <Link href={`/assisteur/demandes/${r.id}`} className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </UrgSection>

            <UrgSection icon={<CreditCard className="w-3.5 h-3.5 text-blue-600" />} label="Paiements à valider" count={paiements.length} color="bg-blue-400">
              {paiements.map(r => {
                const end     = endDateOf(r)
                const daysAgo = Math.floor((now.getTime() - end.getTime()) / 86_400_000)
                return (
                  <div key={r.id} className="flex items-stretch rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden">
                    <div className="w-1 shrink-0 bg-blue-400" />
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">PAIEMENT</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm truncate">{r.sinistre.lastName} {r.sinistre.firstName}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · retour {fmtDate(end)}</p>
                      {daysAgo > 0 && <p className="text-xs font-semibold text-blue-700 mt-1">Retour il y a {daysAgo}j</p>}
                    </div>
                    <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-blue-100 shrink-0">
                      <button onClick={() => setDrawer({ request: r, mode: 'docs' })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors whitespace-nowrap">
                        Docs
                      </button>
                      <Link href={`/assisteur/demandes/${r.id}`} className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </UrgSection>

          </div>
        )}

        {/* Kanban */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">{kanbanLabel}</h2>
          <KanbanPipeline requests={scopedRequests} accountType={accountType} />
        </section>

        {/* Tous les dossiers */}
        <section>
          <button
            onClick={() => setDossierOpen(o => !o)}
            className="flex items-center gap-2 w-full text-left mb-3 group"
          >
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider group-hover:text-brand-600 transition-colors">
              Tous les dossiers
            </h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full tabular-nums">
              {scopedRequests.length}
            </span>
            <span className="ml-auto text-slate-400 group-hover:text-slate-600 transition-colors">
              {dossierOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {dossierOpen && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="search"
                    aria-label="Rechercher une demande"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Dossier, sinistré, adresse…"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                  />
                </div>
                <div className="relative shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium pointer-events-none ${
                    filterDate ? 'bg-brand-500 border-brand-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                  }`}>
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    {filterDate
                      ? <span className="whitespace-nowrap text-xs">{filterDateLabel()}</span>
                      : <span className="hidden sm:inline text-xs">Par date</span>
                    }
                  </div>
                  <input
                    type="date"
                    aria-label="Filtrer par date de création"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    max={todayISODate()}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    aria-label="Effacer le filtre date"
                    className="shrink-0 p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200">
                {TABS.map(t => {
                  const count    = tabCount(t.id)
                  const active   = tab === t.id
                  const isAlert  = t.alert && count > 0
                  const color    = t.alertColor ?? 'red'
                  const dotColor = color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                  const tabActive = isAlert
                    ? color === 'orange' ? 'border-orange-500 text-orange-600' : 'border-red-500 text-red-600'
                    : 'border-brand-500 text-brand-700'
                  const tabInactive = isAlert
                    ? color === 'orange'
                      ? 'border-transparent text-orange-500 hover:text-orange-600 hover:border-orange-200'
                      : 'border-transparent text-red-500 hover:text-red-600 hover:border-red-200'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  const badgeA = isAlert ? (color === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600') : 'bg-brand-100 text-brand-700'
                  const badgeI = isAlert ? (color === 'orange' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500') : 'bg-slate-100 text-slate-500'
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={['shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap', active ? tabActive : tabInactive].join(' ')}
                    >
                      {isAlert && !active && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse shrink-0`} />}
                      {t.label}
                      <span className={['text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center tabular-nums', active ? badgeA : badgeI].join(' ')}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Search className="w-7 h-7 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Aucune demande</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {search ? 'Aucun résultat pour cette recherche.' : 'Aucune demande dans cette catégorie.'}
                    </p>
                  </div>
                  {search && (
                    <button onClick={() => setSearch('')} className="text-sm font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2">
                      Effacer la recherche
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(r => <RequestCard key={r.id} request={r} />)}
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      <AssisteurOperationsDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onSuccess={updated => {
          setAllRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
          setDrawer(null)
        }}
      />
    </>
  )
}

// ── Sub-composants ─────────────────────────────────────────────────────────────

function ScopeBtn({ active, icon, children, onClick }: {
  active: boolean; icon: React.ReactNode; children: React.ReactNode; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={['flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'].join(' ')}
    >
      {icon}{children}
    </button>
  )
}

function MemberBtn({ active, children, onClick }: {
  active: boolean; children: React.ReactNode; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap', active ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'].join(' ')}
    >
      {children}
    </button>
  )
}
