'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link                    from 'next/link'
import { format, addDays }     from 'date-fns'
import { fr }                  from 'date-fns/locale'
import {
  Search, Users, User, Plus, AlertTriangle, CreditCard, Clock,
  ArrowRightLeft, ChevronDown, ChevronUp, RefreshCw, ExternalLink,
  CheckCircle2, Bell, Wrench, Car, CalendarCheck, X, CalendarDays,
  Zap,
} from 'lucide-react'
import { getAllRequests }           from '@/services/requestService'
import { getAllUsers, filterRequestsForUser } from '@/services/assistanceUserService'
import { getSession }              from '@/services/currentSessionService'
import { RequestStats }            from '@/components/assisteur/RequestStats'
import { RequestCard }             from '@/components/assisteur/RequestCard'
import { AssisteurOperationsDrawer } from '@/components/assisteur/AssisteurOperationsDrawer'
import type { AssisteurDrawerState } from '@/components/assisteur/AssisteurOperationsDrawer'
import { getRentalAlertState, getEndDate } from '@/lib/rentalDates'
import { getDisplayStatus, type DisplayStatusType } from '@/lib/displayStatus'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { AssistanceRequest }  from '@/types/request'
import type { AccountType, MockSession } from '@/types/session'
import type { AssistanceUser }     from '@/types/assistanceUser'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'toutes' | DisplayStatusType | 'overdue' | 'transfert'
type Scope     = 'mine' | 'team'

const TABS: { id: FilterTab; label: string; alert?: boolean; alertColor?: 'red' | 'orange' }[] = [
  { id: 'toutes',              label: 'Toutes'          },
  { id: 'en_attente',          label: 'En attente'      },
  { id: 'confirmee',           label: 'Confirmée'       },
  { id: 'en_cours',            label: 'En cours'        },
  { id: 'overdue',             label: 'Overdue',   alert: true, alertColor: 'red'    },
  { id: 'transfert',           label: 'Transferts', alert: true, alertColor: 'orange' },
  { id: 'en_attente_paiement', label: 'Paiement'        },
  { id: 'cloturee',            label: 'Clôturé'         },
]

// ── Pipeline config par rôle ───────────────────────────────────────────────────

type PipelineCol = {
  key:    string
  label:  string
  color:  string
  accent: string
  bg:     string
  match:  (r: AssistanceRequest) => boolean
}

function getPipelineCols(accountType?: AccountType): PipelineCol[] {
  const isGarage = accountType === 'garage'

  if (isGarage) {
    return [
      {
        key:    'immobilises',
        label:  'Immobilisés',
        color:  'text-amber-700',
        accent: 'bg-amber-500',
        bg:     'bg-amber-50',
        match:  r => ['envoyee', 'recue', 'brouillon'].includes(r.status),
      },
      {
        key:    'en_reparation',
        label:  'En réparation',
        color:  'text-orange-700',
        accent: 'bg-orange-500',
        bg:     'bg-orange-50',
        match:  r =>
          r.status === 'confirmee' &&
          new Date(r.dateNeeded) <= new Date() &&
          getEndDate(r) > addDays(new Date(), 1),
      },
      {
        key:    'clients_reloges',
        label:  'Clients relogés',
        color:  'text-emerald-700',
        accent: 'bg-emerald-500',
        bg:     'bg-emerald-50',
        match:  r => r.status === 'confirmee' && new Date(r.dateNeeded) > new Date(),
      },
      {
        key:    'retour',
        label:  'Retour prévu',
        color:  'text-red-700',
        accent: 'bg-red-500',
        bg:     'bg-red-50',
        match:  r =>
          r.status === 'overdue' ||
          (r.status === 'confirmee' && getEndDate(r) <= addDays(new Date(), 1)),
      },
      {
        key:    'a_cloturer',
        label:  'À clôturer',
        color:  'text-slate-700',
        accent: 'bg-slate-400',
        bg:     'bg-slate-50',
        match:  r => r.status === 'honoree',
      },
    ]
  }

  // assistance / insurance_agent
  return [
    {
      key:    'nouvelles',
      label:  'Nouvelles',
      color:  'text-blue-700',
      accent: 'bg-blue-500',
      bg:     'bg-blue-50',
      match:  r => ['brouillon', 'envoyee', 'recue'].includes(r.status),
    },
    {
      key:    'confirmees',
      label:  'Loueur trouvé',
      color:  'text-indigo-700',
      accent: 'bg-indigo-500',
      bg:     'bg-indigo-50',
      match:  r => r.status === 'confirmee' && new Date(r.dateNeeded) > new Date(),
    },
    {
      key:    'en_location',
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
      key:    'retour',
      label:  'Retour / Overdue',
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
}

// ── Action item types ──────────────────────────────────────────────────────────

type ActionKind =
  | { kind: 'overdue';     request: AssistanceRequest }
  | { kind: 'refusee';     request: AssistanceRequest }
  | { kind: 'transfert';   request: AssistanceRequest }
  | { kind: 'immediate';   request: AssistanceRequest; minutesPending: number }
  | { kind: 'urgente';     request: AssistanceRequest }

// ── Kanban pipeline ───────────────────────────────────────────────────────────

// Tab hint par colonne kanban assisteur
const ASSISTEUR_COL_TAB_HINTS: Record<string, string> = {
  retour:     'retour',
  a_cloturer: 'finance',
}

function PipelineMiniCard({ r, tabHint }: { r: AssistanceRequest; tabHint?: string }) {
  const vehicle    = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory
  const overdue    = getRentalAlertState(r) === 'overdue' || r.status === 'overdue'
  const dossierHref = tabHint
    ? `/assisteur/demandes/${r.id}?tab=${tabHint}`
    : `/assisteur/demandes/${r.id}`

  return (
    <a
      href={dossierHref}
      className={`block rounded-xl border bg-white p-3 hover:shadow-md transition-shadow ${
        overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
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
      {overdue && (
        <p className="text-xs font-bold text-red-600 mt-1">Overdue</p>
      )}
    </a>
  )
}

function KanbanPipeline({
  requests,
  accountType,
}: {
  requests:    AssistanceRequest[]
  accountType?: AccountType
}) {
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
                <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
                <span className="ml-auto text-xs font-bold text-slate-400 tabular-nums">
                  {cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {cards.slice(0, 4).map(r => (
                  <PipelineMiniCard key={r.id} r={r} tabHint={ASSISTEUR_COL_TAB_HINTS[col.key]} />
                ))}
                {cards.length > 4 && (
                  <p className="text-xs text-slate-400 text-center py-1">
                    +{cards.length - 4} autres
                  </p>
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

// ── Action center ─────────────────────────────────────────────────────────────

function ActionCenter({
  items,
  onOpenDrawer,
}: {
  items:        ActionKind[]
  onOpenDrawer: (s: AssisteurDrawerState) => void
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Tout est à jour</p>
          <p className="text-xs text-slate-400 mt-0.5">Aucune action urgente en ce moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => {
        const r       = item.request
        const vehicle = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory

        if (item.kind === 'overdue') {
          return (
            <div key={`ov-${r.id}`} className="bg-white rounded-2xl border border-red-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {r.sinistre.firstName} {r.sinistre.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{vehicle} · {r.dossierNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    Overdue
                  </span>
                  <button
                    onClick={() => onOpenDrawer({ request: r, mode: 'overdue' })}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    Régulariser
                  </button>
                  <a
                    href={`/assisteur/demandes/${r.id}?tab=retour`}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )
        }

        if (item.kind === 'refusee') {
          return (
            <div key={`rf-${r.id}`} className="bg-white rounded-2xl border border-red-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {r.sinistre.firstName} {r.sinistre.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">Demande refusée · {vehicle}</p>
                  </div>
                </div>
                <a
                  href={`/assisteur/demandes/${r.id}?tab=envoi`}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors flex items-center gap-1"
                >
                  Trouver un loueur
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )
        }

        if (item.kind === 'transfert') {
          return (
            <div key={`tr-${r.id}`} className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <ArrowRightLeft className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {r.sinistre.firstName} {r.sinistre.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.status === 'transfert_propose' ? 'Transfert en attente de décision' : 'Transfert validé'} · {vehicle}
                    </p>
                  </div>
                </div>
                <a
                  href={`/assisteur/demandes/${r.id}?tab=historique`}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors flex items-center gap-1"
                >
                  Décider
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )
        }

        if (item.kind === 'immediate') {
          return (
            <div key={`im-${r.id}`} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {r.sinistre.firstName} {r.sinistre.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Immédiate · sans réponse depuis {item.minutesPending}min · {vehicle}
                    </p>
                  </div>
                </div>
                <a
                  href={`/assisteur/demandes/${r.id}?tab=envoi`}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                >
                  Relancer
                </a>
              </div>
            </div>
          )
        }

        if (item.kind === 'urgente') {
          return (
            <div key={`ur-${r.id}`} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {r.sinistre.firstName} {r.sinistre.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Prolongation urgente — retour le {format(getEndDate(r), 'd MMM', { locale: fr })}
                    </p>
                  </div>
                </div>
                <a
                  href={`/assisteur/demandes/${r.id}?tab=prolongations`}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                >
                  Traiter
                </a>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AssisteurDashboard() {
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

  const canSeeTeam = session?.companyRole === 'admin' || session?.companyRole === 'superviseur'
  const accountType = session?.accountType

  async function load() {
    const [reqs] = await Promise.all([
      getAllRequests(),
    ])
    setAllRequests(reqs)
  }

  useEffect(() => {
    const s = getSession()
    setSession(s)
    Promise.all([getAllRequests(), Promise.resolve(getAllUsers())]).then(([reqs, usrs]) => {
      setAllRequests(reqs)
      setUsers(usrs)
      setLoading(false)
    })
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  // ── Scoped requests ───────────────────────────────────────────────────────

  const scopedRequests = useMemo(() => {
    if (!session) return allRequests
    const role = session.companyRole
    if (!role) return allRequests
    if (scope === 'mine' || !canSeeTeam) return filterRequestsForUser(allRequests, session.userId, role)
    if (filterUserId !== 'all') return allRequests.filter(r => r.createdByUserId === filterUserId)
    return allRequests
  }, [allRequests, session, scope, canSeeTeam, filterUserId])

  const isOverdue   = (r: AssistanceRequest) => getRentalAlertState(r) === 'overdue'
  const isTransfert = (r: AssistanceRequest) => ['transfert_propose', 'transfert_valide', 'transferee'].includes(r.status)

  const dateFilteredRequests = useMemo(() => {
    if (!filterDate) return scopedRequests
    return scopedRequests.filter(r => {
      const d = new Date(r.createdAt)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === filterDate
    })
  }, [scopedRequests, filterDate])

  // ── Action items ──────────────────────────────────────────────────────────

  const actionItems = useMemo<ActionKind[]>(() => {
    const items: ActionKind[] = []
    const now = Date.now()

    // Overdues (priorité max)
    scopedRequests.filter(isOverdue).forEach(r =>
      items.push({ kind: 'overdue', request: r })
    )

    // Demandes refusées (besoin de trouver un autre loueur)
    scopedRequests.filter(r => r.status === 'refusee').forEach(r =>
      items.push({ kind: 'refusee', request: r })
    )

    // Transferts en attente de décision
    scopedRequests.filter(r => r.status === 'transfert_propose').forEach(r =>
      items.push({ kind: 'transfert', request: r })
    )

    // Demandes immédiates sans réponse > 45min
    scopedRequests
      .filter(r =>
        r.requestType === 'immediate' &&
        ['envoyee', 'recue'].includes(r.status) &&
        Math.floor((now - new Date(r.createdAt).getTime()) / 60_000) > 45
      )
      .forEach(r =>
        items.push({
          kind: 'immediate',
          request: r,
          minutesPending: Math.floor((now - new Date(r.createdAt).getTime()) / 60_000),
        })
      )

    // Prolongations urgentes (J-1 avant retour, pas encore demandées)
    scopedRequests.filter(r => getRentalAlertState(r) === 'extension_urgent').forEach(r =>
      items.push({ kind: 'urgente', request: r })
    )

    return items
  }, [scopedRequests])

  // ── Filtered for dossiers section ─────────────────────────────────────────

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

  function todayISODate() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function filterDateLabel() {
    if (!filterDate) return ''
    const d = new Date(filterDate + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const today = format(new Date(), "EEEE d MMMM", { locale: fr })

  const roleLabel = accountType === 'garage'
    ? 'Cockpit Garage'
    : accountType === 'insurance_agent'
    ? "Cockpit Agent d'assurance"
    : 'Cockpit Assisteur'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1 capitalize">{today}</p>
            <h1 className="text-2xl font-black text-slate-900">
              {session ? `Bonjour, ${session.userName.split(' ')[0]}` : 'Tableau de bord'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {canSeeTeam && scope === 'team' ? 'Vue équipe' : (session?.company ?? roleLabel)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canSeeTeam && (
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
                <ScopeBtn active={scope === 'mine'} icon={<User className="w-3.5 h-3.5" />} onClick={() => { setScope('mine'); setFilterUserId('all') }}>
                  Moi
                </ScopeBtn>
                <ScopeBtn active={scope === 'team'} icon={<Users className="w-3.5 h-3.5" />} onClick={() => setScope('team')}>
                  Équipe
                </ScopeBtn>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/assisteur/nouvelle-demande"
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle demande
            </Link>
          </div>
        </div>

        {/* Filtre membre d'équipe */}
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

        {/* Stats */}
        {loading
          ? <StatsSkeleton />
          : <RequestStats
              requests={scopedRequests}
              onTodayClick={() => setFilterDate(f => f === todayISODate() ? '' : todayISODate())}
              todayActive={filterDate === todayISODate()}
            />
        }

        {/* Section : Actions prioritaires */}
        {!loading && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {accountType === 'garage' ? 'Véhicules à traiter' : 'Actions prioritaires'}
              </h2>
              {actionItems.length > 0 && (
                <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full tabular-nums">
                  {actionItems.length}
                </span>
              )}
            </div>
            <ActionCenter items={actionItems} onOpenDrawer={setDrawer} />
          </section>
        )}

        {/* Section : Pipeline */}
        {!loading && (
          <section>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              {accountType === 'garage' ? 'Pipeline atelier' : 'Pipeline location'}
            </h2>
            <KanbanPipeline requests={scopedRequests} accountType={accountType} />
          </section>
        )}

        {/* Section : Tous les dossiers (collapsible) */}
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
              {/* Recherche + filtre date */}
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
                  <div className={`flex items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all pointer-events-none ${
                    filterDate
                      ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 shadow-sm hover:border-slate-300'
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

              {/* Tabs */}
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
                  const badgeActive  = isAlert ? (color === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600') : 'bg-brand-100 text-brand-700'
                  const badgeInactive = isAlert ? (color === 'orange' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500') : 'bg-slate-100 text-slate-500'
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={[
                        'shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap',
                        active ? tabActive : tabInactive,
                      ].join(' ')}
                    >
                      {isAlert && !active && (
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse shrink-0`} />
                      )}
                      {t.label}
                      <span className={[
                        'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center tabular-nums',
                        active ? badgeActive : badgeInactive,
                      ].join(' ')}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Liste */}
              {loading ? (
                <CardSkeleton />
              ) : filtered.length === 0 ? (
                <EmptyState search={search} onClear={() => setSearch('')} />
              ) : (
                <div className="space-y-3">
                  {filtered.map(r => <RequestCard key={r.id} request={r} />)}
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      {/* Drawer */}
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScopeBtn({ active, icon, children, onClick }: {
  active: boolean; icon: React.ReactNode; children: React.ReactNode; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
      ].join(' ')}
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
      className={[
        'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
        active ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 shadow-sm animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-slate-100" />
          <div className="space-y-2">
            <div className="h-8 w-10 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
          <div className="w-1 bg-slate-200 shrink-0" />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 bg-slate-200 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="flex gap-4">
              <div className="h-3 w-32 bg-slate-100 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Search className="w-7 h-7 text-slate-400" />
      </div>
      <div>
        <p className="font-semibold text-slate-700">Aucune demande</p>
        <p className="text-sm text-slate-400 mt-1">
          {search ? 'Aucun résultat pour cette recherche.' : "Créez votre première demande d'assistance."}
        </p>
      </div>
      {search && (
        <button
          onClick={onClear}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
        >
          Effacer la recherche
        </button>
      )}
    </div>
  )
}
