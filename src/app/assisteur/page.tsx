'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Users, User, Plus, AlertTriangle, CreditCard, Clock, ArrowRightLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import { getAllRequests } from '@/services/requestService'
import { getAllUsers, filterRequestsForUser } from '@/services/assistanceUserService'
import { getSession } from '@/services/currentSessionService'
import { RequestStats } from '@/components/assisteur/RequestStats'
import { RequestCard }  from '@/components/assisteur/RequestCard'
import type { AssistanceRequest } from '@/types/request'
import { getDisplayStatus, type DisplayStatusType } from '@/lib/displayStatus'
import { getRentalAlertState } from '@/lib/rentalDates'
import type { MockSession } from '@/types/session'
import type { AssistanceUser } from '@/types/assistanceUser'

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

export default function AssisteurDashboard() {
  const [allRequests, setAllRequests]       = useState<AssistanceRequest[]>([])
  const [users, setUsers]                   = useState<AssistanceUser[]>([])
  const [session, setSession]               = useState<MockSession | null>(null)
  const [loading, setLoading]               = useState(true)
  const [tab, setTab]                       = useState<FilterTab>('toutes')
  const [search, setSearch]                 = useState('')
  const [filterDate, setFilterDate]         = useState('')
  const [scope, setScope]                   = useState<Scope>('mine')
  const [filterUserId, setFilterUserId]     = useState<string>('all')

  const canSeeTeam = session?.companyRole === 'admin' || session?.companyRole === 'superviseur'

  useEffect(() => {
    const s = getSession()
    setSession(s)
    Promise.all([getAllRequests(), Promise.resolve(getAllUsers())]).then(([reqs, usrs]) => {
      setAllRequests(reqs)
      setUsers(usrs)
      setLoading(false)
    })
  }, [])

  const scopedRequests = useMemo(() => {
    if (!session) return allRequests
    const role = session.companyRole
    if (!role) return allRequests
    if (scope === 'mine' || !canSeeTeam) return filterRequestsForUser(allRequests, session.userId, role)
    if (filterUserId !== 'all') return allRequests.filter(r => r.createdByUserId === filterUserId)
    return allRequests
  }, [allRequests, session, scope, canSeeTeam, filterUserId])

  const isOverdue    = (r: AssistanceRequest) => getRentalAlertState(r) === 'overdue'
  const isTransfert  = (r: AssistanceRequest) => ['transfert_propose', 'transfert_valide', 'transferee'].includes(r.status)

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

  function todayISODate() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function filterDateLabel() {
    if (!filterDate) return ''
    const d = new Date(filterDate + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1 capitalize">{today}</p>
          <h1 className="text-2xl font-black text-slate-900">
            {session ? `Bonjour, ${session.userName.split(' ')[0]}` : 'Tableau de bord'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {canSeeTeam && scope === 'team' ? "Vue équipe" : session?.company ?? 'Vos demandes'}
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
          <Link
            href="/assisteur/nouvelle-demande"
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
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

      {/* ── Stats ── */}
      {loading
        ? <StatsSkeleton />
        : <RequestStats
            requests={scopedRequests}
            onTodayClick={() => setFilterDate(f => f === todayISODate() ? '' : todayISODate())}
            todayActive={filterDate === todayISODate()}
          />
      }

      {/* ── Tâches prioritaires ── */}
      {!loading && <TaskPriorityStrip requests={scopedRequests} onFilterTab={setTab} />}

      {/* ── Séparateur visuel ── */}
      <div className="space-y-3">
        {/* Recherche + filtre date */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              aria-label="Rechercher une demande"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Dossier, sinistré, adresse…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
            />
          </div>

          {/* Bouton filtre par date */}
          <div className="relative shrink-0">
            {/* Styled display — rendered first, sits behind */}
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
            {/* Input on top — rendered last, intercepts clicks */}
            <input
              type="date"
              aria-label="Filtrer par date de création"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              max={todayISODate()}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Effacer le filtre date */}
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

        {/* Tabs underline */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200">
          {TABS.map(t => {
            const count    = tabCount(t.id)
            const active   = tab === t.id
            const isAlert  = t.alert && count > 0
            const color    = t.alertColor ?? 'red'
            const dotColor = color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
            const tabActive = isAlert
              ? color === 'orange'
                ? 'border-orange-500 text-orange-600'
                : 'border-red-500 text-red-600'
              : 'border-brand-500 text-brand-700'
            const tabInactive = isAlert
              ? color === 'orange'
                ? 'border-transparent text-orange-500 hover:text-orange-600 hover:border-orange-200'
                : 'border-transparent text-red-500 hover:text-red-600 hover:border-red-200'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            const badgeActive = isAlert
              ? color === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
              : 'bg-brand-100 text-brand-700'
            const badgeInactive = isAlert
              ? color === 'orange' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'
              : 'bg-slate-100 text-slate-500'
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
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse shrink-0`} aria-hidden="true" />
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
      </div>

      {/* ── Liste ── */}
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
  )
}

// ── Task priority strip ───────────────────────────────────────────────────────

function TaskPriorityStrip({
  requests,
  onFilterTab,
}: {
  requests:    import('@/types/request').AssistanceRequest[]
  onFilterTab: (tab: FilterTab) => void
}) {
  const overdue         = requests.filter(r => getRentalAlertState(r) === 'overdue')
  const paymentPending  = requests.filter(r => r.status === 'honoree')
  const transferPending = requests.filter(r => r.status === 'transfert_propose')
  const awaitingReply   = requests.filter(r => ['envoyee', 'recue'].includes(r.status))

  const tasks = [
    overdue.length > 0 && {
      count: overdue.length,
      label: overdue.length > 1 ? 'dossiers en retard' : 'dossier en retard',
      sub:   'Action immédiate',
      icon:  <AlertTriangle className="w-4 h-4" />,
      accent: 'bg-red-500',
      bg:    'bg-red-50 border-red-200 text-red-700',
      tab:   'overdue' as FilterTab,
    },
    paymentPending.length > 0 && {
      count: paymentPending.length,
      label: paymentPending.length > 1 ? 'paiements à valider' : 'paiement à valider',
      sub:   'Documents reçus',
      icon:  <CreditCard className="w-4 h-4" />,
      accent: 'bg-blue-500',
      bg:    'bg-blue-50 border-blue-200 text-blue-700',
      tab:   'en_attente_paiement' as FilterTab,
    },
    transferPending.length > 0 && {
      count: transferPending.length,
      label: transferPending.length > 1 ? 'transferts en attente' : 'transfert en attente',
      sub:   'Décision requise',
      icon:  <ArrowRightLeft className="w-4 h-4" />,
      accent: 'bg-orange-500',
      bg:    'bg-orange-50 border-orange-200 text-orange-700',
      tab:   'transfert' as FilterTab,
    },
    awaitingReply.length > 0 && {
      count: awaitingReply.length,
      label: awaitingReply.length > 1 ? 'en attente de réponse' : 'en attente de réponse',
      sub:   'Relancer si nécessaire',
      icon:  <Clock className="w-4 h-4" />,
      accent: 'bg-amber-500',
      bg:    'bg-amber-50 border-amber-200 text-amber-700',
      tab:   'en_attente' as FilterTab,
    },
  ].filter(Boolean) as {
    count: number; label: string; sub: string
    icon: React.ReactNode; accent: string; bg: string; tab: FilterTab
  }[]

  if (tasks.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions prioritaires</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {tasks.map(t => (
          <button
            key={t.tab + t.label}
            onClick={() => onFilterTab(t.tab)}
            className={`shrink-0 flex items-center gap-3 pl-0 pr-4 py-3 rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-all group`}
          >
            <div className={`w-1 self-stretch shrink-0 ${t.accent}`} />
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${t.bg.split(' ')[0]} ${t.bg.split(' ')[1]}`}>
              <span className={t.bg.split(' ')[2]}>{t.icon}</span>
            </div>
            <div className="text-left">
              <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{t.count}</p>
              <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">{t.label}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors ml-1" />
          </button>
        ))}
      </div>
    </div>
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
    <div className="flex flex-col items-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Search className="w-7 h-7 text-slate-400" aria-hidden="true" />
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
