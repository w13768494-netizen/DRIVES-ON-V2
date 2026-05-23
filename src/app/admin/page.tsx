'use client'

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { format, addDays }     from 'date-fns'
import { fr }                  from 'date-fns/locale'
import {
  Users, Building2, FileText, CheckCircle2, Clock, XCircle,
  TrendingUp, AlertTriangle, ArrowRightLeft, Activity, UserCheck,
  RefreshCw, ShieldAlert, CreditCard, FileWarning, ExternalLink,
  BadgeCheck, ChevronDown, ChevronUp, Gavel,
} from 'lucide-react'
import { getAdminReservations }  from '@/services/adminReservationService'
import { getAgencyConfigAlerts } from '@/services/adminAlertService'
import { getDisplayStatus }      from '@/lib/displayStatus'
import { getEndDate }            from '@/lib/rentalDates'
import type { AdminReservation } from '@/types/adminReservation'
import type { AdminAgency }      from '@/app/api/admin/agencies/route'
import type { AdminUser }        from '@/types/adminUser'

// ── Pipeline config ───────────────────────────────────────────────────────────

type PipelineCol = {
  key:    string
  label:  string
  color:  string
  accent: string
  bg:     string
  match:  (r: AdminReservation) => boolean
}

const PIPELINE_COLS: PipelineCol[] = [
  {
    key:    'alertes',
    label:  'Alertes',
    color:  'text-red-700',
    accent: 'bg-red-500',
    bg:     'bg-red-50',
    match:  r => r.alerts.some(a => a.severity === 'rouge') || r.status === 'overdue' || r.status === 'litige_degat',
  },
  {
    key:    'sans_loueur',
    label:  'Sans loueur',
    color:  'text-amber-700',
    accent: 'bg-amber-500',
    bg:     'bg-amber-50',
    match:  r => ['envoyee', 'recue', 'refusee'].includes(r.status),
  },
  {
    key:    'transferts',
    label:  'Transferts',
    color:  'text-orange-700',
    accent: 'bg-orange-500',
    bg:     'bg-orange-50',
    match:  r => ['transfert_propose', 'transfert_valide', 'transferee'].includes(r.status),
  },
  {
    key:    'finance',
    label:  'Finance',
    color:  'text-violet-700',
    accent: 'bg-violet-500',
    bg:     'bg-violet-50',
    match:  r => r.status === 'honoree' || r.paymentStatus === 'en_attente',
  },
  {
    key:    'docs',
    label:  'Documents',
    color:  'text-blue-700',
    accent: 'bg-blue-500',
    bg:     'bg-blue-50',
    match:  r => r.missingDocuments.length > 0 && !['cloturee', 'refusee'].includes(r.status),
  },
]

// ── Alert priority item ───────────────────────────────────────────────────────

type AlertItem = {
  kind:    'overdue' | 'litige' | 'non_retour' | 'sans_loueur_immediate' | 'finance' | 'docs'
  request: AdminReservation
  label:   string
}

function buildAlertItems(requests: AdminReservation[]): AlertItem[] {
  const items: AlertItem[] = []

  // Critiques
  requests.filter(r => r.status === 'overdue').forEach(r =>
    items.push({ kind: 'overdue', request: r, label: 'Overdue — retour non effectué' })
  )
  requests.filter(r => r.status === 'litige_degat').forEach(r =>
    items.push({ kind: 'litige', request: r, label: 'Sinistre / litige déclaré' })
  )
  requests.filter(r => (r.adminFlags ?? []).includes('non_retour_signale') && r.status !== 'overdue').forEach(r =>
    items.push({ kind: 'non_retour', request: r, label: 'Non-retour signalé par le loueur' })
  )

  // Urgents
  requests
    .filter(r =>
      r.requestType === 'immediate' &&
      ['envoyee', 'recue'].includes(r.status) &&
      Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60_000) > 45
    )
    .forEach(r =>
      items.push({ kind: 'sans_loueur_immediate', request: r, label: 'Immédiate sans réponse > 45min' })
    )

  // Finance
  requests.filter(r => r.status === 'honoree').forEach(r =>
    items.push({ kind: 'finance', request: r, label: 'Paiement loueur en attente' })
  )

  // Docs manquants
  requests.filter(r => r.missingDocuments.length > 0 && ['confirmee', 'honoree'].includes(r.status)).slice(0, 5).forEach(r =>
    items.push({ kind: 'docs', request: r, label: `Docs manquants : ${r.missingDocuments.join(', ')}` })
  )

  return items
}

const ALERT_ICONS: Record<AlertItem['kind'], React.ReactNode> = {
  overdue:               <AlertTriangle className="w-4 h-4 text-red-600" />,
  litige:                <Gavel         className="w-4 h-4 text-red-600" />,
  non_retour:            <ShieldAlert   className="w-4 h-4 text-red-600" />,
  sans_loueur_immediate: <Clock         className="w-4 h-4 text-amber-600" />,
  finance:               <CreditCard    className="w-4 h-4 text-violet-600" />,
  docs:                  <FileWarning   className="w-4 h-4 text-blue-600" />,
}

const ALERT_BG: Record<AlertItem['kind'], string> = {
  overdue:               'border-red-200',
  litige:                'border-red-200',
  non_retour:            'border-red-200',
  sans_loueur_immediate: 'border-amber-200',
  finance:               'border-violet-200',
  docs:                  'border-blue-200',
}

const ALERT_BTN: Record<AlertItem['kind'], string> = {
  overdue:               'bg-red-600 hover:bg-red-700 text-white',
  litige:                'bg-red-100 hover:bg-red-200 text-red-700',
  non_retour:            'bg-red-100 hover:bg-red-200 text-red-700',
  sans_loueur_immediate: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
  finance:               'bg-violet-100 hover:bg-violet-200 text-violet-700',
  docs:                  'bg-blue-100 hover:bg-blue-200 text-blue-700',
}

// ── Quick actions grid ────────────────────────────────────────────────────────

type QuickAction = {
  label:   string
  sub:     string
  href:    string
  icon:    React.ReactNode
  color:   string
  count?:  number
  alert?:  boolean
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPlatformPage() {
  const [requests,      setRequests]      = useState<AdminReservation[]>([])
  const [adminUsers,    setAdminUsers]    = useState<AdminUser[]>([])
  const [agencies,      setAgencies]      = useState<AdminAgency[]>([])
  const [pendingCount,  setPendingCount]  = useState(0)
  const [agencyAlerts,  setAgencyAlerts]  = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [refreshedAt,   setRefreshedAt]   = useState(new Date())
  const [detailOpen,    setDetailOpen]    = useState(false)

  async function load() {
    setLoading(true)
    const [reqs, candsRes, agencyRes, usersRes, sysAlerts] = await Promise.all([
      getAdminReservations(),
      fetch('/api/admin/access-requests?status=pending').then(r => r.json()).catch(() => []),
      fetch('/api/admin/agencies').then(r => r.json()).catch(() => []) as Promise<AdminAgency[]>,
      fetch('/api/admin/users').then(r => r.json()).catch(() => [])    as Promise<AdminUser[]>,
      getAgencyConfigAlerts(),
    ])
    setRequests(reqs)
    setAdminUsers(Array.isArray(usersRes) ? usersRes : [])
    setAgencies(agencyRes)
    setPendingCount(Array.isArray(candsRes) ? candsRes.length : 0)
    setAgencyAlerts(sysAlerts.length)
    setRefreshedAt(new Date())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Calculs ──────────────────────────────────────────────────────────────────

  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week  = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)

  const alertesRouge    = requests.filter(r => r.alerts.some(a => a.severity === 'rouge')).length
  const totalReqs       = requests.length
  const activeReqs      = requests.filter(r => ['envoyee','recue','confirmee'].includes(r.status)).length
  const enCours         = requests.filter(r => getDisplayStatus(r.status, r.dateNeeded) === 'en_cours').length
  const cloturees       = requests.filter(r => r.status === 'cloturee').length
  const enAttentePay    = requests.filter(r => r.status === 'honoree').length
  const transferts      = requests.filter(r => ['transfert_propose','transfert_valide','transferee'].includes(r.status)).length
  const todayReqs       = requests.filter(r => new Date(r.createdAt) >= today).length
  const weekReqs        = requests.filter(r => new Date(r.createdAt) >= week).length

  const confirmed       = requests.filter(r => r.confirmedAt)
  const tauxConfirmation= totalReqs > 0 ? Math.round((confirmed.length / totalReqs) * 100) : 0

  const assisteurs      = adminUsers.filter(u => u.role === 'assisteur')
  const activeUsers     = assisteurs.filter(u => u.is_active).length
  const activeLoueurs   = agencies.filter(a => a.is_available).length

  const alertItems = buildAlertItems(requests)

  const quickActions: QuickAction[] = [
    {
      label: 'Opérations',
      sub:   'Centre de contrôle',
      href:  '/admin/operations',
      icon:  <Activity className="w-5 h-5" />,
      color: 'bg-brand-50 text-brand-600',
    },
    {
      label:  'Finance',
      sub:    'Valider paiements',
      href:   '/admin/finance',
      icon:   <CreditCard className="w-5 h-5" />,
      color:  'bg-violet-50 text-violet-600',
      count:  enAttentePay,
      alert:  enAttentePay > 0,
    },
    {
      label:  'Candidatures',
      sub:    'Dossiers à traiter',
      href:   '/admin/candidatures',
      icon:   <UserCheck className="w-5 h-5" />,
      color:  'bg-amber-50 text-amber-600',
      count:  pendingCount,
      alert:  pendingCount > 0,
    },
    {
      label:  'Transferts',
      sub:    'Décisions en attente',
      href:   '/admin/operations',
      icon:   <ArrowRightLeft className="w-5 h-5" />,
      color:  'bg-orange-50 text-orange-600',
      count:  transferts,
      alert:  transferts > 0,
    },
    {
      label: 'Déploiement',
      sub:   'Villes & couverture',
      href:  '/admin/deploiement',
      icon:  <Building2 className="w-5 h-5" />,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Utilisateurs',
      sub:   'Comptes & accès',
      href:  '/admin/utilisateurs',
      icon:  <Users className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-600',
    },
  ]

  const recent = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const STATUS_DIST: { label: string; count: number; color: string }[] = [
    { label: 'En attente',       count: requests.filter(r => ['envoyee','recue'].includes(r.status)).length, color: 'bg-amber-400'   },
    { label: 'Confirmée',        count: requests.filter(r => r.status === 'confirmee').length,               color: 'bg-emerald-400' },
    { label: 'En cours',         count: enCours,                                                             color: 'bg-orange-400'  },
    { label: 'Paiement',         count: enAttentePay,                                                        color: 'bg-blue-400'    },
    { label: 'Transfert',        count: transferts,                                                          color: 'bg-violet-400'  },
    { label: 'Clôturée',         count: cloturees,                                                          color: 'bg-slate-300'   },
  ]

  const maxDist = Math.max(...STATUS_DIST.map(s => s.count), 1)

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1 capitalize">
            {format(new Date(), "EEEE d MMMM", { locale: fr })}
          </p>
          <h1 className="text-2xl font-black text-slate-900">État de la plateforme</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Vue temps réel — actualisé à {refreshedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Alertes prioritaires */}
      {!loading && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Alertes prioritaires</h2>
            {alertItems.length > 0 && (
              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full tabular-nums">
                {alertItems.length}
              </span>
            )}
          </div>

          {alertItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Aucune alerte active</p>
                <p className="text-xs text-slate-400 mt-0.5">La plateforme tourne normalement.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {alertItems.slice(0, 8).map((item, idx) => (
                <div
                  key={`${item.kind}-${item.request.id}`}
                  className={`bg-white rounded-2xl border shadow-sm p-4 ${ALERT_BG[item.kind]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {ALERT_ICONS[item.kind]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {item.request.sinistre.firstName} {item.request.sinistre.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {item.label} · {item.request.dossierNumber}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/admin/demandes/${item.request.id}`}
                      className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${ALERT_BTN[item.kind]}`}
                    >
                      Traiter
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
              {alertItems.length > 8 && (
                <Link
                  href="/admin/operations"
                  className="text-xs text-slate-500 hover:text-brand-600 text-center py-2 transition-colors"
                >
                  +{alertItems.length - 8} autres alertes → Voir opérations
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Accès rapide</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(qa => (
            <Link
              key={qa.href + qa.label}
              href={qa.href}
              className={`relative bg-white rounded-2xl border ${qa.alert ? 'border-amber-300' : 'border-slate-200'} p-4 flex flex-col gap-2 hover:shadow-md transition-all group`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${qa.color}`}>
                {qa.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 leading-tight">{qa.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{qa.sub}</p>
              </div>
              {qa.count !== undefined && qa.count > 0 && (
                <span className="absolute top-2 right-2 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full tabular-nums min-w-[18px] text-center">
                  {qa.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Pipeline opérationnel</h2>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-52 shrink-0 flex flex-col gap-2 animate-pulse">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-20 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div className="flex gap-3 min-w-max">
              {PIPELINE_COLS.map(col => {
                const cards = requests.filter(col.match)
                return (
                  <div key={col.key} className="w-52 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                        {col.label}
                      </span>
                      <span className="ml-auto text-xs font-bold text-slate-400 tabular-nums">{cards.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {cards.slice(0, 4).map(r => (
                        <a
                          key={r.id}
                          href={`/admin/demandes/${r.id}`}
                          className="block bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <p className="text-xs font-mono text-slate-400 truncate">{r.dossierNumber}</p>
                            <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {r.sinistre.firstName} {r.sinistre.lastName}
                          </p>
                          {r.alerts.length > 0 && (
                            <p className="text-xs text-red-600 font-medium mt-0.5 truncate">
                              {r.alerts[0].label}
                            </p>
                          )}
                        </a>
                      ))}
                      {cards.length > 4 && (
                        <Link
                          href="/admin/operations"
                          className="text-xs text-slate-400 hover:text-slate-600 text-center py-1 transition-colors"
                        >
                          +{cards.length - 4} autres
                        </Link>
                      )}
                      {cards.length === 0 && (
                        <div className={`rounded-xl border border-dashed border-slate-200 py-6 flex items-center justify-center`}>
                          <span className="text-xs text-slate-300">Aucun</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Agency alert notice */}
      {agencyAlerts > 0 && !loading && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-800">
            <span className="font-semibold">{agencyAlerts} agence{agencyAlerts > 1 ? 's' : ''} active{agencyAlerts > 1 ? 's' : ''}</span>
            {' '}sans coordonnées GPS — le matching géographique est dégradé pour ces agences.
          </p>
        </div>
      )}

      {/* KPIs + Détails (collapsible) */}
      <section>
        <button
          onClick={() => setDetailOpen(o => !o)}
          className="flex items-center gap-2 w-full text-left mb-3 group"
        >
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider group-hover:text-brand-600 transition-colors">
            KPIs & Statistiques
          </h2>
          <span className="ml-auto text-slate-400 group-hover:text-slate-600">
            {detailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {detailOpen && (
          <div className="flex flex-col gap-6">
            {/* Ligne 1 : KPIs principaux */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={<FileText className="w-5 h-5" />}      label="Demandes actives"       value={activeReqs}             sub={`${totalReqs} au total`}                                           color="brand"   loading={loading} />
              <KpiCard icon={<Activity className="w-5 h-5" />}      label="En cours de location"   value={enCours}                sub={`${todayReqs} créée${todayReqs > 1 ? 's' : ''} aujourd'hui`}      color="orange"  loading={loading} />
              <KpiCard icon={<Users className="w-5 h-5" />}         label="Assisteurs actifs"      value={activeUsers}            sub={`${assisteurs.length} compte${assisteurs.length !== 1 ? 's' : ''} total`} color="green" loading={loading} />
              <KpiCard icon={<Building2 className="w-5 h-5" />}     label="Loueurs actifs"         value={activeLoueurs}          sub={`${agencies.length} agence${agencies.length !== 1 ? 's' : ''} total`}    color="violet" loading={loading} />
            </div>

            {/* Ligne 2 : alertes + taux */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard icon={<TrendingUp className="w-5 h-5" />}    label="Taux de confirmation"   value={`${tauxConfirmation} %`} sub={`${confirmed.length} confirmées`}                                  color="green"  loading={loading} />
              <KpiCard icon={<UserCheck className="w-5 h-5" />}     label="Candidatures en attente" value={pendingCount}           sub="À traiter"                                                          color={pendingCount > 0 ? 'amber' : 'slate'} loading={loading} alert={pendingCount > 0} />
              <KpiCard icon={<ArrowRightLeft className="w-5 h-5" />} label="Transferts en cours"   value={transferts}             sub="Décision en attente"                                                color={transferts > 0 ? 'orange' : 'slate'}  loading={loading} alert={transferts > 0} />
              <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Alertes critiques"      value={alertesRouge}           sub="dossiers avec alerte rouge"                                        color={alertesRouge > 0 ? 'orange' : 'slate'} loading={loading} alert={alertesRouge > 0} />
              <KpiCard icon={<Activity className="w-5 h-5" />}      label="Cette semaine"          value={weekReqs}              sub="demandes créées"                                                    color="brand"  loading={loading} />
            </div>

            {/* Ligne 3 : répartition + activité récente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-700">Répartition des demandes</h3>
                {loading ? (
                  <div className="flex flex-col gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-24 h-3 bg-slate-200 rounded" />
                        <div className="flex-1 h-3 bg-slate-100 rounded-full" />
                        <div className="w-6 h-3 bg-slate-200 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {STATUS_DIST.map(s => (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24 shrink-0">{s.label}</span>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${s.color}`} style={{ width: `${(s.count / maxDist) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 tabular-nums w-4 text-right">{s.count}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                      <span>Total : <strong className="text-slate-700">{totalReqs}</strong> demandes</span>
                      <span>Taux clôture : <strong className="text-slate-700">{totalReqs > 0 ? Math.round((cloturees / totalReqs) * 100) : 0} %</strong></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-700">Activité récente</h3>
                {loading ? (
                  <div className="flex flex-col gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-xl bg-slate-100" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 w-32 bg-slate-200 rounded" />
                          <div className="h-2.5 w-20 bg-slate-100 rounded" />
                        </div>
                        <div className="h-5 w-16 bg-slate-100 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-50">
                    {recent.map(r => {
                      const ds = getDisplayStatus(r.status, r.dateNeeded)
                      const statusColors: Record<string, string> = {
                        en_attente:          'bg-amber-50 text-amber-700',
                        confirmee:           'bg-emerald-50 text-emerald-700',
                        en_cours:            'bg-orange-50 text-orange-700',
                        en_attente_paiement: 'bg-blue-50 text-blue-700',
                        cloturee:            'bg-slate-100 text-slate-500',
                      }
                      const statusLabels: Record<string, string> = {
                        en_attente:          'En attente',
                        confirmee:           'Confirmée',
                        en_cours:            'En cours',
                        en_attente_paiement: 'Paiement',
                        cloturee:            'Clôturée',
                      }
                      const created = new Date(r.createdAt)
                      const isToday = created >= today
                      const dateStr = isToday
                        ? created.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      return (
                        <a key={r.id} href={`/admin/demandes/${r.id}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50/50 transition-colors rounded-lg px-1 -mx-1">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {r.sinistre.firstName} {r.sinistre.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{r.dossierNumber}</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[ds] ?? 'bg-slate-100 text-slate-500'}`}>
                              {statusLabels[ds] ?? ds}
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums">{dateStr}</span>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

type KpiColor = 'brand' | 'green' | 'orange' | 'violet' | 'amber' | 'slate'

function KpiCard({
  icon, label, value, sub, color, loading, alert = false,
}: {
  icon:    React.ReactNode
  label:   string
  value:   number | string
  sub:     string
  color:   KpiColor
  loading: boolean
  alert?:  boolean
}) {
  const colors: Record<KpiColor, { bg: string; icon: string; value: string }> = {
    brand:  { bg: 'bg-brand-50',  icon: 'text-brand-500',  value: 'text-brand-700'  },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  value: 'text-green-700'  },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', value: 'text-orange-700' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-500', value: 'text-violet-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500',  value: 'text-amber-700'  },
    slate:  { bg: 'bg-slate-50',  icon: 'text-slate-400',  value: 'text-slate-600'  },
  }
  const c = colors[color]

  return (
    <div className={`bg-white rounded-2xl border ${alert ? 'border-amber-300' : 'border-slate-200'} p-4 flex flex-col gap-3 shadow-sm`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
        <span className={c.icon}>{icon}</span>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 w-12 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
      ) : (
        <div>
          <p className={`text-3xl font-black tabular-nums leading-none ${c.value}`}>{value}</p>
          <p className="text-xs text-slate-400 mt-1">{sub}</p>
        </div>
      )}
      <p className="text-xs font-semibold text-slate-600">{label}</p>
    </div>
  )
}
