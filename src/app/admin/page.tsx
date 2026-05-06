'use client'

import { useEffect, useState } from 'react'
import {
  Users, Building2, FileText, CheckCircle2, Clock, XCircle,
  TrendingUp, AlertTriangle, ArrowRightLeft, Activity, UserCheck,
  RefreshCw,
} from 'lucide-react'
import { getAllRequests }       from '@/services/requestService'
import { getAllUsers }          from '@/services/assistanceUserService'
import { getAllLoueurAccounts } from '@/services/loueurAccountService'
import { getCandidatures }     from '@/services/candidatureService'
import { getDisplayStatus }    from '@/lib/displayStatus'
import type { AssistanceRequest } from '@/types/request'
import type { AssistanceUser }    from '@/types/assistanceUser'
import type { LoueurAccount }     from '@/types/loueurAccount'
import type { Candidature }       from '@/types/candidature'

export default function AdminPlatformPage() {
  const [requests,    setRequests]    = useState<AssistanceRequest[]>([])
  const [users,       setUsers]       = useState<AssistanceUser[]>([])
  const [loueurs,     setLoueurs]     = useState<LoueurAccount[]>([])
  const [candidatures,setCandidatures]= useState<Candidature[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshedAt, setRefreshedAt] = useState(new Date())

  async function load() {
    setLoading(true)
    const [reqs, cands] = await Promise.all([getAllRequests(), getCandidatures()])
    setRequests(reqs)
    setUsers(getAllUsers())
    setLoueurs(getAllLoueurAccounts())
    setCandidatures(cands)
    setRefreshedAt(new Date())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Calculs ──────────────────────────────────────────────────────────────────

  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week  = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)

  const totalReqs       = requests.length
  const activeReqs      = requests.filter(r => ['envoyee','recue','confirmee'].includes(r.status)).length
  const enCours         = requests.filter(r => {
    const ds = getDisplayStatus(r.status, r.dateNeeded)
    return ds === 'en_cours'
  }).length
  const cloturees       = requests.filter(r => r.status === 'cloturee').length
  const enAttentePay    = requests.filter(r => r.status === 'honoree').length
  const transferts      = requests.filter(r => ['transfert_propose','transfert_valide','transferee'].includes(r.status)).length
  const todayReqs       = requests.filter(r => new Date(r.createdAt) >= today).length
  const weekReqs        = requests.filter(r => new Date(r.createdAt) >= week).length

  const confirmed       = requests.filter(r => r.confirmedAt)
  const tauxConfirmation= totalReqs > 0 ? Math.round((confirmed.length / totalReqs) * 100) : 0

  const activeUsers     = users.filter(u => u.active !== false).length
  const activeLoueurs   = loueurs.filter(l => l.active).length
  const pendingCands    = candidatures.filter(c => c.status === 'en_attente').length

  const recent = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const STATUS_DIST: { label: string; count: number; color: string }[] = [
    { label: 'En attente',       count: requests.filter(r => ['envoyee','recue'].includes(r.status)).length,       color: 'bg-amber-400'   },
    { label: 'Confirmée',        count: requests.filter(r => r.status === 'confirmee').length,                     color: 'bg-emerald-400' },
    { label: 'En cours',         count: enCours,                                                                   color: 'bg-orange-400'  },
    { label: 'Paiement',         count: enAttentePay,                                                              color: 'bg-blue-400'    },
    { label: 'Transfert',        count: transferts,                                                                 color: 'bg-violet-400'  },
    { label: 'Clôturée',         count: cloturees,                                                                 color: 'bg-slate-300'   },
  ]

  const maxDist = Math.max(...STATUS_DIST.map(s => s.count), 1)

  return (
    <div className="p-8 flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
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

      {/* ── Ligne 1 : KPIs principaux ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<FileText className="w-5 h-5" />}
          label="Demandes actives"
          value={activeReqs}
          sub={`${totalReqs} au total`}
          color="brand"
          loading={loading}
        />
        <KpiCard
          icon={<Activity className="w-5 h-5" />}
          label="En cours de location"
          value={enCours}
          sub={`${todayReqs} créée${todayReqs > 1 ? 's' : ''} aujourd'hui`}
          color="orange"
          loading={loading}
        />
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="Assisteurs actifs"
          value={activeUsers}
          sub={`${users.length} comptes total`}
          color="green"
          loading={loading}
        />
        <KpiCard
          icon={<Building2 className="w-5 h-5" />}
          label="Loueurs actifs"
          value={activeLoueurs}
          sub={`${loueurs.length} comptes total`}
          color="violet"
          loading={loading}
        />
      </div>

      {/* ── Ligne 2 : alertes + taux ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Taux de confirmation"
          value={`${tauxConfirmation} %`}
          sub={`${confirmed.length} confirmées`}
          color="green"
          loading={loading}
        />
        <KpiCard
          icon={<UserCheck className="w-5 h-5" />}
          label="Candidatures en attente"
          value={pendingCands}
          sub="À traiter"
          color={pendingCands > 0 ? 'amber' : 'slate'}
          loading={loading}
          alert={pendingCands > 0}
        />
        <KpiCard
          icon={<ArrowRightLeft className="w-5 h-5" />}
          label="Transferts en cours"
          value={transferts}
          sub="Décision en attente"
          color={transferts > 0 ? 'orange' : 'slate'}
          loading={loading}
          alert={transferts > 0}
        />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Cette semaine"
          value={weekReqs}
          sub="demandes créées"
          color="brand"
          loading={loading}
        />
      </div>

      {/* ── Ligne 3 : répartition + activité récente ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Répartition statuts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-700">Répartition des demandes</h2>
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
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                      style={{ width: `${(s.count / maxDist) * 100}%` }}
                    />
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

        {/* Activité récente */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-700">Activité récente</h2>
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
                  <div key={r.id} className="flex items-center gap-3 py-2.5">
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
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
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
