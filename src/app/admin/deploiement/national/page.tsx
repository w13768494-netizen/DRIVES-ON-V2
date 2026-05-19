'use client'

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { ArrowLeft, MapPin, TrendingUp, Globe, AlertCircle } from 'lucide-react'
import type { NationalStats } from '@/app/api/admin/analytics/national/route'

// ── Statut badge ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active:    'Actif',
  deploying: 'En déploiement',
  planned:   'Planifié',
  inactive:  'Inactif',
}

const STATUS_CLASS: Record<string, string> = {
  active:    'bg-green-50 text-green-700 border-green-200',
  deploying: 'bg-amber-50 text-amber-700 border-amber-200',
  planned:   'bg-slate-100 text-slate-600 border-slate-200',
  inactive:  'bg-red-50 text-red-600 border-red-200',
}

// ── KPI tile ──────────────────────────────────────────────────────────────────

function KpiTile({ icon: Icon, label, value, sub, iconClass }: {
  icon:      React.ElementType
  label:     string
  value:     string | number
  sub?:      string
  iconClass: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NationalPage() {
  const [stats,   setStats]   = useState<NationalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics/national')
      .then(r => r.json())
      .then((data: NationalStats & { error?: string }) => {
        if (data.error) setError(data.error)
        else            setStats(data)
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center gap-4">
        <Link
          href="/admin/deploiement"
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics nationales</h1>
          <p className="text-sm text-slate-500 mt-0.5">Couverture géographique des demandes</p>
        </div>
      </header>

      {/* ── Corps ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {loading && (
          <div className="text-center py-20 text-slate-400 text-sm">Chargement…</div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiTile
                icon={TrendingUp}
                label="Demandes totales"
                value={stats.total}
                iconClass="bg-slate-100 text-slate-600"
              />
              <KpiTile
                icon={MapPin}
                label="En zone couverte"
                value={stats.en_zone}
                sub={stats.pct_couvert != null ? `${stats.pct_couvert}% du total` : undefined}
                iconClass="bg-green-50 text-green-600"
              />
              <KpiTile
                icon={AlertCircle}
                label="Hors zone"
                value={stats.hors_zone}
                sub={stats.total > 0 ? `${100 - (stats.pct_couvert ?? 0)}% du total` : undefined}
                iconClass="bg-amber-50 text-amber-600"
              />
              <KpiTile
                icon={Globe}
                label="Régions actives"
                value={stats.regions.length}
                iconClass="bg-orange-50 text-orange-500"
              />
            </div>

            {/* Tableau régions */}
            {stats.regions.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Par région</h2>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Région</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Demandes</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">% du total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.regions.map(r => (
                        <tr key={r.region} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-800">{r.region}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-700">{r.count}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                            {stats.en_zone > 0 ? `${Math.round(r.count / stats.en_zone * 100)} %` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Tableau villes */}
            {stats.cities.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Par ville</h2>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ville</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Région</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Demandes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.cities.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                          <td className="px-5 py-3 text-slate-500">{c.region}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASS[c.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {STATUS_LABEL[c.status] ?? c.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-700">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {stats.total === 0 && (
              <div className="text-center py-16 text-slate-400 text-sm">
                Aucune demande enregistrée pour l&apos;instant.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
