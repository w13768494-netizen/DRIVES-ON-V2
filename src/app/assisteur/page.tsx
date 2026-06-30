'use client'

import { useEffect, useState, useMemo } from 'react'
import Link                    from 'next/link'
import { format }              from 'date-fns'
import { fr }                  from 'date-fns/locale'
import {
  Users, User, Plus, AlertTriangle, ArrowRightLeft,
  ChevronRight, RefreshCw, ExternalLink,
  CheckCircle2, Bell, CalendarCheck, Zap,
} from 'lucide-react'
import { getAllRequests }           from '@/services/requestService'
import { getTeamMembers } from '@/services/assistanceUserService'
import { getSession }              from '@/services/currentSessionService'
import { RequestStats }            from '@/components/assisteur/RequestStats'
import { AssisteurOperationsDrawer } from '@/components/assisteur/AssisteurOperationsDrawer'
import type { AssisteurDrawerState } from '@/components/assisteur/AssisteurOperationsDrawer'
import { getRentalAlertState, getEndDate } from '@/lib/rentalDates'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { AssistanceRequest }  from '@/types/request'
import type { AccountType, MockSession } from '@/types/session'
import type { TeamMember }         from '@/types/assistanceUser'

// ── Types ─────────────────────────────────────────────────────────────────────

type Scope = 'mine' | 'team'

type ActionKind =
  | { kind: 'overdue';     request: AssistanceRequest }
  | { kind: 'refusee';     request: AssistanceRequest }
  | { kind: 'transfert';   request: AssistanceRequest }
  | { kind: 'immediate';   request: AssistanceRequest; minutesPending: number }
  | { kind: 'urgente';     request: AssistanceRequest }

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
  const [members,      setMembers]      = useState<TeamMember[]>([])
  const [session,      setSession]      = useState<MockSession | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [drawer,       setDrawer]       = useState<AssisteurDrawerState | null>(null)
  const [scope,        setScope]        = useState<Scope>('mine')
  const [filterUserId, setFilterUserId] = useState<string>('all')

  const canSeeTeam  = session?.companyRole === 'admin' || session?.companyRole === 'superviseur'
  const accountType = session?.accountType

  useEffect(() => {
    const s = getSession()
    setSession(s)
    Promise.all([getAllRequests(), getTeamMembers()]).then(([reqs, mbrs]) => {
      setAllRequests(reqs)
      setMembers(mbrs)
      setLoading(false)
    })
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    const reqs = await getAllRequests()
    setAllRequests(reqs)
    setRefreshing(false)
  }

  const scopedRequests = useMemo(() => {
    if (!session) return allRequests
    if (scope === 'mine' || !canSeeTeam) return allRequests.filter(r => r.createdByUserId === session.userId)
    if (filterUserId !== 'all') return allRequests.filter(r => r.createdByUserId === filterUserId)
    return allRequests
  }, [allRequests, session, scope, canSeeTeam, filterUserId])

  const isOverdue = (r: AssistanceRequest) => getRentalAlertState(r) === 'overdue'

  const actionItems = useMemo<ActionKind[]>(() => {
    const items: ActionKind[] = []
    const now = Date.now()

    scopedRequests.filter(isOverdue).forEach(r =>
      items.push({ kind: 'overdue', request: r })
    )
    scopedRequests.filter(r => r.status === 'refusee').forEach(r =>
      items.push({ kind: 'refusee', request: r })
    )
    scopedRequests.filter(r => r.status === 'transfert_propose').forEach(r =>
      items.push({ kind: 'transfert', request: r })
    )
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
    scopedRequests.filter(r => getRentalAlertState(r) === 'extension_urgent').forEach(r =>
      items.push({ kind: 'urgente', request: r })
    )

    return items
  }, [scopedRequests])

  const today     = format(new Date(), "EEEE d MMMM", { locale: fr })
  const roleLabel = accountType === 'garage'
    ? 'Cockpit Garage'
    : accountType === 'insurance_agent'
    ? "Cockpit Agent d'assurance"
    : 'Cockpit Assisteur'

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
        {canSeeTeam && scope === 'team' && members.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <MemberBtn active={filterUserId === 'all'} onClick={() => setFilterUserId('all')}>
              Tous ({allRequests.length})
            </MemberBtn>
            {members.map(m => {
              const count = allRequests.filter(r => r.createdByUserId === m.id).length
              return (
                <MemberBtn key={m.id} active={filterUserId === m.id} onClick={() => setFilterUserId(m.id)}>
                  {m.fullName.split(' ')[0]} {(m.fullName.split(' ')[1] ?? '')[0]}. ({count})
                </MemberBtn>
              )
            })}
          </div>
        )}

        {/* Stats */}
        {loading
          ? <StatsSkeleton />
          : <RequestStats requests={scopedRequests} />
        }

        {/* Actions prioritaires */}
        {!loading && (
          <section>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {accountType === 'garage' ? 'Véhicules à traiter' : 'Actions prioritaires'}
                </h2>
                {actionItems.length > 0 && (
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full tabular-nums">
                    {actionItems.length}
                  </span>
                )}
              </div>
              <Link
                href="/assisteur/pipeline"
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Voir le pipeline
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ActionCenter items={actionItems.slice(0, 3)} onOpenDrawer={setDrawer} />
            {actionItems.length > 3 && (
              <p className="text-xs text-slate-400 text-center mt-3">
                +{actionItems.length - 3} autres actions —{' '}
                <Link href="/assisteur/pipeline" className="text-brand-600 hover:underline font-semibold">
                  voir le pipeline
                </Link>
              </p>
            )}
          </section>
        )}

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
