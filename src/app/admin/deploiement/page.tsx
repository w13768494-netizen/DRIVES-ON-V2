'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MapPin, Users, ChevronDown, ChevronRight,
  Car, Loader2, CheckCircle2, AlertCircle,
  Building2, Check, X, ExternalLink, RefreshCw,
} from 'lucide-react'
import { getAllDeploymentCities, updateDeploymentCityStatus } from '@/services/deploymentService'
import { VEHICLE_CATEGORY_LABELS, VEHICLE_CATEGORY_GROUPS } from '@/types/vehicleCategory'
import { AGENCY_SERVICE_LABELS }                            from '@/types/agencyService'
import type { DeploymentCity, DeploymentStatus }            from '@/types/deploymentCity'
import type { VehicleCategoryType }                         from '@/types/vehicleCategory'
import type { AgencyServiceType }                           from '@/types/agencyService'
import type { AdminAgency }                                 from '@/app/api/admin/agencies/route'

// ── Statuts ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DeploymentStatus, {
  label:      string
  dotColor:   string
  badgeClass: string
}> = {
  active:    { label: 'Actif',          dotColor: 'bg-green-500', badgeClass: 'bg-green-50 text-green-700 border-green-200'   },
  deploying: { label: 'En déploiement', dotColor: 'bg-amber-400', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'   },
  planned:   { label: 'Planifié',       dotColor: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'  },
  inactive:  { label: 'Inactif',        dotColor: 'bg-red-400',   badgeClass: 'bg-red-50 text-red-600 border-red-200'         },
}

type StatusAction = { label: string; next: DeploymentStatus; btnClass: string }

function getActions(status: DeploymentStatus): StatusAction[] {
  switch (status) {
    case 'planned':
      return [{ label: 'Démarrer',   next: 'deploying', btnClass: 'bg-amber-500 hover:bg-amber-600 text-white' }]
    case 'deploying':
      return [
        { label: 'Activer',   next: 'active',   btnClass: 'bg-green-600 hover:bg-green-700 text-white'                           },
        { label: 'Annuler',   next: 'planned',  btnClass: 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-300'    },
      ]
    case 'active':
      return [{ label: 'Désactiver', next: 'inactive', btnClass: 'bg-white hover:bg-red-50 text-red-600 border border-red-200' }]
    case 'inactive':
      return [{ label: 'Réactiver',  next: 'active',   btnClass: 'bg-green-600 hover:bg-green-700 text-white'                  }]
  }
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function DeploiementPage() {
  const [cities,        setCities]        = useState<DeploymentCity[]>([])
  const [loading,       setLoading]       = useState(true)
  const [updating,      setUpdating]      = useState<string | null>(null)
  const [openRegions,   setOpenRegions]   = useState<Set<string>>(new Set())
  const [openCities,    setOpenCities]    = useState<Set<string>>(new Set())
  const [refreshing,    setRefreshing]    = useState(false)
  const [refreshResult, setRefreshResult] = useState<{ updated: number; errors: string[] } | null>(null)

  const load = useCallback(async () => {
    const [cityData, agencyRes] = await Promise.all([
      getAllDeploymentCities(),
      fetch('/api/admin/agencies').then(r => r.json()).catch(() => []) as Promise<AdminAgency[]>,
    ])

    // Compute real loueur counts per city (match by city name)
    const countByCity = new Map<string, number>()
    for (const a of agencyRes) {
      if (!a.city) continue
      const key = a.city.toLowerCase().trim()
      countByCity.set(key, (countByCity.get(key) ?? 0) + 1)
    }

    const enriched = cityData.map(c => ({
      ...c,
      loueurCount: countByCity.get(c.name.toLowerCase().trim()) ?? 0,
    }))

    setCities(enriched)
    setOpenRegions(new Set(enriched.map(c => c.region)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRefreshScores() {
    setRefreshing(true)
    setRefreshResult(null)
    try {
      const res  = await fetch('/api/admin/agencies/refresh-scores', { method: 'POST' })
      const body = await res.json() as { updated: number; errors: string[] }
      setRefreshResult(body)
    } catch {
      setRefreshResult({ updated: 0, errors: ['Erreur réseau'] })
    } finally {
      setRefreshing(false)
    }
  }

  async function handleStatusChange(city: DeploymentCity, next: DeploymentStatus) {
    setUpdating(city.id)
    try {
      await updateDeploymentCityStatus(city.id, next)
      setCities(prev => prev.map(c =>
        c.id === city.id
          ? { ...c, status: next, activatedAt: next === 'active' ? new Date() : c.activatedAt }
          : c
      ))
    } catch (err) {
      console.error('Erreur mise à jour statut:', err)
    } finally {
      setUpdating(null)
    }
  }

  function toggleRegion(region: string) {
    setOpenRegions(prev => {
      const next = new Set(prev)
      next.has(region) ? next.delete(region) : next.add(region)
      return next
    })
  }

  function toggleCity(cityId: string) {
    setOpenCities(prev => {
      const next = new Set(prev)
      next.has(cityId) ? next.delete(cityId) : next.add(cityId)
      return next
    })
  }

  // KPIs
  const activeCities  = cities.filter(c => c.status === 'active')
  const totalLoueurs  = activeCities.reduce((s, c) => s + c.loueurCount, 0)
  const activeRegions = new Set(activeCities.map(c => c.region)).size

  // Groupement par région
  const byRegion = cities.reduce<Record<string, DeploymentCity[]>>((acc, city) => {
    if (!acc[city.region]) acc[city.region] = []
    acc[city.region].push(city)
    return acc
  }, {})
  const regions = Object.keys(byRegion).sort()

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Déploiement France</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Seules les villes <span className="font-semibold text-green-600">actives</span> participent au matching — cliquez sur une ville pour voir sa couverture
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              onClick={handleRefreshScores}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Calcul en cours…' : 'Rafraîchir les scores'}
            </button>
            {refreshResult && (
              <p className={`text-[11px] tabular-nums ${refreshResult.errors.length > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {refreshResult.updated} agence{refreshResult.updated > 1 ? 's' : ''} mise{refreshResult.updated > 1 ? 's' : ''} à jour
                {refreshResult.errors.length > 0 && ` · ${refreshResult.errors.length} erreur${refreshResult.errors.length > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <KpiCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} value={loading ? '—' : String(activeCities.length)} label="Villes actives"    bg="bg-green-50"  />
          <KpiCard icon={<Users        className="w-5 h-5 text-brand-600" />} value={loading ? '—' : String(totalLoueurs)}         label="Loueurs actifs"   bg="bg-orange-50" />
          <KpiCard icon={<MapPin       className="w-5 h-5 text-blue-600"  />} value={loading ? '—' : String(activeRegions)}        label="Régions couvertes" bg="bg-blue-50"  />
        </div>

        {/* Liste par région */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : cities.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300" />
            <p className="text-slate-500 text-sm">Aucune ville configurée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {regions.map(region => {
              const regionCities  = byRegion[region]
              const activeCount   = regionCities.filter(c => c.status === 'active').length
              const isRegionOpen  = openRegions.has(region)

              return (
                <div key={region} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

                  {/* En-tête région */}
                  <button
                    onClick={() => toggleRegion(region)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isRegionOpen
                        ? <ChevronDown  className="w-4 h-4 text-slate-400" />
                        : <ChevronRight className="w-4 h-4 text-slate-400" />
                      }
                      <span className="font-semibold text-slate-800 text-sm">{region}</span>
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {activeCount}/{regionCities.length} active{activeCount > 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Villes */}
                  {isRegionOpen && (
                    <div className="border-t border-slate-100">
                      {regionCities.map(city => {
                        const cfg         = STATUS_CONFIG[city.status]
                        const actions     = getActions(city.status)
                        const isUpd       = updating === city.id
                        const isCityOpen  = openCities.has(city.id)

                        return (
                          <div key={city.id} className="border-t border-slate-100 first:border-t-0">

                            {/* Ligne ville */}
                            <div className="px-5 py-3.5 flex items-center gap-4">

                              {/* Expand toggle + nom */}
                              <button
                                onClick={() => toggleCity(city.id)}
                                className="flex items-center gap-2 min-w-0 shrink-0 w-48 group text-left"
                              >
                                {isCityOpen
                                  ? <ChevronDown  className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-brand-500 transition-colors" />
                                  : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-brand-500 transition-colors" />
                                }
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-brand-600 transition-colors">
                                    {city.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">{city.department} ({city.departmentCode})</p>
                                </div>
                              </button>

                              {/* Statut */}
                              <div className="w-36 shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                                  {cfg.label}
                                </span>
                              </div>

                              {/* Loueurs */}
                              <div className="w-20 shrink-0 flex items-center gap-1.5 text-slate-600">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-sm tabular-nums">{city.loueurCount}</span>
                              </div>

                              {/* Véhicules */}
                              <div className="flex-1 flex flex-wrap gap-1">
                                {city.vehicleTypes.length > 0
                                  ? city.vehicleTypes.map(vt => (
                                      <span key={vt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full">
                                        <Car className="w-3 h-3" />
                                        {vt.charAt(0).toUpperCase() + vt.slice(1)}
                                      </span>
                                    ))
                                  : <span className="text-xs text-slate-300">—</span>
                                }
                              </div>

                              {/* Actions statut */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isUpd ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                ) : (
                                  actions.map(action => (
                                    <button
                                      key={action.next}
                                      onClick={() => handleStatusChange(city, action.next)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${action.btnClass}`}
                                    >
                                      {action.label}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Panneau détail */}
                            {isCityOpen && <CityDetailPanel city={city} />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Panneau détail d'une ville (données Supabase) ────────────────────────────

function CityDetailPanel({ city }: { city: DeploymentCity }) {
  const [agencies,     setAgencies]     = useState<AdminAgency[]>([])
  const [panelLoading, setPanelLoading] = useState(true)
  const cfg = STATUS_CONFIG[city.status]

  useEffect(() => {
    fetch(`/api/admin/agencies?city=${encodeURIComponent(city.name)}`)
      .then(r => r.json())
      .then((data: AdminAgency[]) => { setAgencies(data); setPanelLoading(false) })
      .catch(() => setPanelLoading(false))
  }, [city.name])

  // Dériver couverture véhicules depuis les catégories des agences
  const allCats        = agencies.flatMap(a => a.categories)
  const availableCats  = [...new Set(allCats.filter(c => c.available).map(c => c.category))] as VehicleCategoryType[]
  const tourismeCats   = availableCats.filter(t => VEHICLE_CATEGORY_GROUPS[t] === 'tourisme')
  const utilitaireCats = availableCats.filter(t => VEHICLE_CATEGORY_GROUPS[t] === 'utilitaire')

  // Dériver services depuis les agences
  const serviceMap = new Map<AgencyServiceType, boolean>()
  for (const svc of agencies.flatMap(a => a.services)) {
    serviceMap.set(svc.type as AgencyServiceType, (serviceMap.get(svc.type as AgencyServiceType) ?? false) || svc.available)
  }

  const avgRadius = agencies.length > 0
    ? Math.round(agencies.reduce((s, a) => s + (a.service_radius_km ?? 0), 0) / agencies.length)
    : null

  if (panelLoading) {
    return (
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-6 py-5">
      <div className="grid grid-cols-3 gap-6">

        {/* ── Colonne 1 : Loueurs ── */}
        <div>
          <SectionTitle icon={<Building2 className="w-3.5 h-3.5" />} label="Loueurs enregistrés" />
          {agencies.length === 0 ? (
            <EmptyMsg>Aucun loueur rattaché</EmptyMsg>
          ) : (
            <div className="space-y-2 mt-2">
              {agencies.map(a => (
                <div key={a.id} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{a.agency_name}</p>
                    {a.score_total != null
                      ? <ScoreBadge score={a.score_total} />
                      : <span className="text-[11px] text-slate-300 italic shrink-0">Non calculé</span>
                    }
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {a.email && <p className="text-[11px] text-slate-400 truncate">{a.email}</p>}
                    {a.service_radius_km != null && (
                      <span className="text-[11px] text-slate-400 shrink-0 ml-auto tabular-nums">{a.service_radius_km} km</span>
                    )}
                  </div>
                  {a.score_total != null && (
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                      <ScoreRow label="Réactivité"   value={a.score_reactivity}    max={40} color="bg-blue-400"  />
                      <ScoreRow label="Taux réponse" value={a.score_response_rate} max={40} color="bg-brand-400" />
                      <ScoreRow label="Fiabilité"    value={a.score_reliability}   max={20} color="bg-green-400" />
                      {a.avg_response_min != null && (
                        <p className="text-[10px] text-slate-400 tabular-nums pt-0.5">
                          Délai moy. : <span className="font-semibold text-slate-600">{a.avg_response_min} min</span>
                          {' · '}{a.total_received ?? 0} reçue{(a.total_received ?? 0) > 1 ? 's' : ''}
                          {' · '}{a.total_confirmed ?? 0} confirmée{(a.total_confirmed ?? 0) > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {avgRadius !== null && (
            <p className="text-[11px] text-slate-500 mt-2 tabular-nums">
              Rayon moyen : <span className="font-semibold text-slate-700">{avgRadius} km</span>
            </p>
          )}
        </div>

        {/* ── Colonne 2 : Couverture véhicules ── */}
        <div className="space-y-4">
          <SectionTitle icon={<Car className="w-3.5 h-3.5" />} label="Couverture véhicules" />

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tourisme</p>
              {tourismeCats.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tourismeCats.map(cat => <CategoryBadge key={cat} label={VEHICLE_CATEGORY_LABELS[cat]} color="blue" />)}
                </div>
              ) : <EmptyMsg>Non couvert</EmptyMsg>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Utilitaire</p>
              {utilitaireCats.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {utilitaireCats.map(cat => <CategoryBadge key={cat} label={VEHICLE_CATEGORY_LABELS[cat]} color="amber" />)}
                </div>
              ) : <EmptyMsg>Non couvert</EmptyMsg>}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Statut déploiement</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
              {cfg.label}
            </span>
            {city.activatedAt && (
              <p className="text-[11px] text-slate-400 mt-1.5">
                Activée le {city.activatedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* ── Colonne 3 : Services ── */}
        <div>
          <SectionTitle label="Services disponibles" />
          {serviceMap.size === 0 ? (
            <EmptyMsg>Aucun service enregistré pour cette ville</EmptyMsg>
          ) : (
            <div className="space-y-1.5 mt-2">
              {(Array.from(serviceMap.entries()) as [AgencyServiceType, boolean][]).map(([type, available]) => (
                <div key={type} className="flex items-center gap-2">
                  {available
                    ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    : <X     className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  }
                  <span className={`text-xs ${available ? 'text-slate-700' : 'text-slate-400'}`}>
                    {AGENCY_SERVICE_LABELS[type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA tester matching */}
      <div className="mt-5 pt-4 border-t border-slate-200">
        <Link
          href="/assisteur/nouvelle-demande"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Simuler une demande à {city.name}
        </Link>
        <p className="text-[11px] text-slate-400 mt-1.5">
          Saisir une adresse de {city.name} comme lieu du sinistre pour vérifier la couverture
        </p>
      </div>
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function KpiCard({ icon, value, label, bg }: { icon: React.ReactNode; value: string; label: string; bg: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function SectionTitle({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {icon && <span className="text-slate-400">{icon}</span>}
      <p className="text-xs font-bold text-slate-600">{label}</p>
    </div>
  )
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 italic mt-1">{children}</p>
}

function CategoryBadge({ label, color }: { label: string; color: 'blue' | 'amber' }) {
  const cls = color === 'blue'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-green-50 text-green-700 border-green-200'
            : score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200'
            :               'bg-red-50 text-red-600 border-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-black tabular-nums shrink-0 ${cls}`}>
      {score}/100
    </span>
  )
}

function ScoreBar({ value, max, color }: { value: number | null; max: number; color: string }) {
  const pct = value != null ? Math.round(value / max * 100) : 0
  return (
    <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ScoreRow({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-20 shrink-0">{label}</span>
      <div className="flex-1">
        <ScoreBar value={value} max={max} color={color} />
      </div>
      <span className="text-[10px] font-semibold text-slate-600 tabular-nums w-10 text-right">
        {value ?? '—'}/{max}
      </span>
    </div>
  )
}
