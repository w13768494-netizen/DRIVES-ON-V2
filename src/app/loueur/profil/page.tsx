'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Building2, MapPin, Phone, Mail, Ruler, Plus, Pencil, Trash2,
  Loader2, X, Check, Clock, User, ToggleLeft, ToggleRight,
} from 'lucide-react'
import {
  getMyAgencies, createAgency, updateAgency, deleteAgency,
  type RentalAgencyRow, type AgencyInput,
} from '@/services/rentalAgencyService'
import {
  getAgencyServices, upsertAgencyService, deleteAgencyService,
  type AgencyServiceRow, type AgencyServiceInput,
} from '@/services/agencyServicesService'
import {
  getAgencyVehicleCategories, upsertAgencyVehicleCategory,
  type AgencyVehicleCategoryRow,
} from '@/services/agencyVehicleCategoriesService'
import {
  STANDARD_SERVICE_TYPES, AGENCY_SERVICE_LABELS, SERVICE_PRICE_LABELS,
  type AgencyServiceType, type ServicePriceType,
} from '@/types/agencyService'
import {
  TOURISME_CATEGORIES, UTILITAIRE_CATEGORIES,
  VEHICLE_CATEGORY_LABELS, VEHICLE_CATEGORY_GROUPS,
  type VehicleCategoryType, type PricingPackage,
} from '@/types/vehicleCategory'
import { getSession } from '@/services/currentSessionService'
import type { MockSession } from '@/types/session'

// ── Constants ─────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all'
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1'

const EMPTY_INPUT: AgencyInput = {
  agency_name: '', company_name: null, email: null, phone: null,
  address: null, city: null, postal_code: null, service_radius_km: null,
  contact_name: null, is_available: true,
  opening_hours_weekdays: null, opening_hours_saturday: null, opening_hours_sunday: null,
}

const DEFAULT_PACKAGES: PricingPackage[] = [
  { label: '3 jours',  days: 3, price: 0 },
  { label: '7 jours',  days: 7, price: 0 },
  { label: 'Week-end', days: 2, price: 0 },
]

// ── AgencyForm ────────────────────────────────────────────────────────────────

function AgencyForm({
  initial, onSave, onCancel, saving,
}: {
  initial:  AgencyInput
  onSave:   (v: AgencyInput) => void
  onCancel: () => void
  saving:   boolean
}) {
  const [v, setV] = useState<AgencyInput>(initial)

  const str = (k: keyof AgencyInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV(p => ({ ...p, [k]: e.target.value || null }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(v) }} className="flex flex-col gap-4">

      {/* Identité */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls}>Nom de l'agence *</label>
          <input className={inputCls} placeholder="Agence Paris Centre"
            value={v.agency_name}
            onChange={e => setV(p => ({ ...p, agency_name: e.target.value }))}
            required />
        </div>
        <div>
          <label className={labelCls}>Société / groupe</label>
          <input className={inputCls} placeholder="AutoGroup SARL"
            value={v.company_name ?? ''} onChange={str('company_name')} />
        </div>
        <div>
          <label className={labelCls}>Contact principal</label>
          <input className={inputCls} placeholder="Jean Dupont"
            value={v.contact_name ?? ''} onChange={str('contact_name')} />
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} placeholder="agence@exemple.fr" type="email"
            value={v.email ?? ''} onChange={str('email')} />
        </div>
        <div>
          <label className={labelCls}>Téléphone</label>
          <input className={inputCls} placeholder="01 23 45 67 89" type="tel"
            value={v.phone ?? ''} onChange={str('phone')} />
        </div>
      </div>

      {/* Localisation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls}>Adresse</label>
          <input className={inputCls} placeholder="15 rue de la Paix"
            value={v.address ?? ''} onChange={str('address')} />
        </div>
        <div>
          <label className={labelCls}>Ville</label>
          <input className={inputCls} placeholder="Paris"
            value={v.city ?? ''} onChange={str('city')} />
        </div>
        <div>
          <label className={labelCls}>Code postal</label>
          <input className={inputCls} placeholder="75001"
            value={v.postal_code ?? ''} onChange={str('postal_code')} />
        </div>
        <div>
          <label className={labelCls}>Rayon de service (km)</label>
          <input className={inputCls} placeholder="25" type="number" min="1"
            value={v.service_radius_km ?? ''}
            onChange={e => setV(p => ({ ...p, service_radius_km: e.target.value ? Number(e.target.value) : null }))} />
        </div>
      </div>

      {/* Disponibilité & Horaires */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Disponibilité</span>
          <button type="button"
            onClick={() => setV(p => ({ ...p, is_available: !p.is_available }))}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              v.is_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
            ].join(' ')}>
            <span className={['w-2.5 h-2.5 rounded-full', v.is_available ? 'bg-green-500' : 'bg-slate-300'].join(' ')} />
            {v.is_available ? 'Disponible' : 'Indisponible'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Lun – Ven</label>
            <input className={inputCls} placeholder="8h – 18h"
              value={v.opening_hours_weekdays ?? ''} onChange={str('opening_hours_weekdays')} />
          </div>
          <div>
            <label className={labelCls}>Samedi</label>
            <input className={inputCls} placeholder="9h – 12h"
              value={v.opening_hours_saturday ?? ''} onChange={str('opening_hours_saturday')} />
          </div>
          <div>
            <label className={labelCls}>Dimanche</label>
            <input className={inputCls} placeholder="Fermé"
              value={v.opening_hours_sunday ?? ''} onChange={str('opening_hours_sunday')} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
          <X className="w-3.5 h-3.5" /> Annuler
        </button>
        <button type="submit" disabled={!v.agency_name || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Enregistrer
        </button>
      </div>
    </form>
  )
}

// ── AgencyInfoView ────────────────────────────────────────────────────────────

function AgencyInfoView({ agency, onEdit }: { agency: RentalAgencyRow; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Modifier
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-600">
        {agency.contact_name && (
          <span className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 shrink-0 text-slate-400" /> {agency.contact_name}
          </span>
        )}
        {(agency.address || agency.city) && (
          <span className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            {[agency.address, agency.city, agency.postal_code].filter(Boolean).join(', ')}
          </span>
        )}
        {agency.phone && (
          <span className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" /> {agency.phone}
          </span>
        )}
        {agency.email && (
          <span className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" /> {agency.email}
          </span>
        )}
        {agency.service_radius_km && (
          <span className="flex items-center gap-2">
            <Ruler className="w-3.5 h-3.5 shrink-0 text-slate-400" /> Rayon : {agency.service_radius_km} km
          </span>
        )}
      </div>

      {(agency.opening_hours_weekdays || agency.opening_hours_saturday || agency.opening_hours_sunday) && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Horaires
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-600">
            {agency.opening_hours_weekdays && (
              <div><span className="font-semibold text-slate-500 block mb-0.5">Lun – Ven</span>{agency.opening_hours_weekdays}</div>
            )}
            {agency.opening_hours_saturday && (
              <div><span className="font-semibold text-slate-500 block mb-0.5">Samedi</span>{agency.opening_hours_saturday}</div>
            )}
            {agency.opening_hours_sunday && (
              <div><span className="font-semibold text-slate-500 block mb-0.5">Dimanche</span>{agency.opening_hours_sunday}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── AgencyServicesPanel ───────────────────────────────────────────────────────

type ServiceState = {
  id?:        string
  available:  boolean
  price_type: ServicePriceType
  price:      number | null
  label:      string | null
}

const DEFAULT_SERVICE: ServiceState = { available: true, price_type: 'inclus', price: null, label: null }

function AgencyServicesPanel({ agencyId }: { agencyId: string }) {
  const [dbRows,      setDbRows]      = useState<AgencyServiceRow[]>([])
  const [state,       setState]       = useState<Record<string, ServiceState>>({})
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [customLabel, setCustomLabel] = useState('')

  useEffect(() => {
    getAgencyServices(agencyId).then(rows => {
      setDbRows(rows)
      const init: Record<string, ServiceState> = {}
      for (const type of STANDARD_SERVICE_TYPES) {
        const row = rows.find(r => r.type === type)
        init[type] = row
          ? { id: row.id, available: row.available, price_type: row.price_type, price: row.price, label: null }
          : { ...DEFAULT_SERVICE }
      }
      for (const row of rows.filter(r => r.type === 'custom')) {
        init[row.id] = { id: row.id, available: row.available, price_type: row.price_type, price: row.price, label: row.label }
      }
      setState(init)
      setLoading(false)
    })
  }, [agencyId])

  const upd = (key: string, patch: Partial<ServiceState>) =>
    setState(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const handleSave = async () => {
    setSaving(true)
    for (const [key, s] of Object.entries(state)) {
      if (!s.available && !s.id) continue
      const isStandard = (STANDARD_SERVICE_TYPES as string[]).includes(key)
      const input: AgencyServiceInput = {
        id:         s.id,
        type:       isStandard ? (key as AgencyServiceType) : 'custom',
        label:      s.label,
        available:  s.available,
        price_type: s.price_type,
        price:      s.price,
      }
      const result = await upsertAgencyService(agencyId, input)
      if (result && !s.id) upd(key, { id: result.id })
    }
    setSaving(false)
  }

  const handleAddCustom = async () => {
    if (!customLabel.trim()) return
    setSaving(true)
    const result = await upsertAgencyService(agencyId, {
      type: 'custom', label: customLabel.trim(),
      available: true, price_type: 'inclus', price: null,
    })
    if (result) {
      setDbRows(prev => [...prev, result])
      setState(prev => ({
        ...prev,
        [result.id]: { id: result.id, available: true, price_type: 'inclus', price: null, label: result.label },
      }))
      setCustomLabel('')
    }
    setSaving(false)
  }

  const handleDeleteCustom = async (id: string) => {
    await deleteAgencyService(id)
    setDbRows(prev => prev.filter(r => r.id !== id))
    setState(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  }

  const customRows = dbRows.filter(r => r.type === 'custom')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-slate-100">
        {STANDARD_SERVICE_TYPES.map(type => {
          const s = state[type] ?? DEFAULT_SERVICE
          return (
            <div key={type} className="flex items-center gap-3 py-3">
              <button type="button" onClick={() => upd(type, { available: !s.available })} className="shrink-0">
                {s.available
                  ? <ToggleRight className="w-5 h-5 text-brand-500" />
                  : <ToggleLeft  className="w-5 h-5 text-slate-300" />}
              </button>
              <span className={['flex-1 text-sm', s.available ? 'text-slate-800' : 'text-slate-400'].join(' ')}>
                {AGENCY_SERVICE_LABELS[type]}
              </span>
              {s.available && (
                <>
                  <select value={s.price_type}
                    onChange={e => upd(type, { price_type: e.target.value as ServicePriceType })}
                    className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400">
                    {(Object.entries(SERVICE_PRICE_LABELS) as [ServicePriceType, string][]).map(([k, l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                  {s.price_type === 'fixe' && (
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" step="0.01" placeholder="0"
                        value={s.price ?? ''}
                        onChange={e => upd(type, { price: e.target.value ? Number(e.target.value) : null })}
                        className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                      <span className="text-xs text-slate-400">€</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {customRows.map(row => {
        const s = state[row.id]
        if (!s) return null
        return (
          <div key={row.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <button type="button" onClick={() => upd(row.id, { available: !s.available })} className="shrink-0">
              {s.available
                ? <ToggleRight className="w-5 h-5 text-brand-500" />
                : <ToggleLeft  className="w-5 h-5 text-slate-300" />}
            </button>
            <span className="flex-1 text-sm text-slate-700">{row.label}</span>
            <select value={s.price_type}
              onChange={e => upd(row.id, { price_type: e.target.value as ServicePriceType })}
              className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white focus:outline-none">
              {(Object.entries(SERVICE_PRICE_LABELS) as [ServicePriceType, string][]).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            {s.price_type === 'fixe' && (
              <div className="flex items-center gap-1">
                <input type="number" min="0" step="0.01" value={s.price ?? ''}
                  onChange={e => upd(row.id, { price: e.target.value ? Number(e.target.value) : null })}
                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none" />
                <span className="text-xs text-slate-400">€</span>
              </div>
            )}
            <button onClick={() => handleDeleteCustom(row.id)}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}

      <div className="flex gap-2">
        <input placeholder="Service personnalisé…" value={customLabel}
          onChange={e => setCustomLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom() } }}
          className={inputCls} />
        <button onClick={handleAddCustom} disabled={!customLabel.trim() || saving}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="flex justify-end pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Enregistrer les services
        </button>
      </div>
    </div>
  )
}

// ── AgencyCategoriesPanel ─────────────────────────────────────────────────────

type CatState = {
  id?:                 string
  available:           boolean
  stock_estimate:      number
  daily_rate:          number
  deposit:             number
  included_km_per_day: number
  extra_km_price:      number
  packages:            PricingPackage[]
}

const DEFAULT_CAT: CatState = {
  available: true, stock_estimate: 0, daily_rate: 0, deposit: 0,
  included_km_per_day: 0, extra_km_price: 0, packages: DEFAULT_PACKAGES,
}

function AgencyCategoriesPanel({ agencyId }: { agencyId: string }) {
  const [state,   setState]   = useState<Partial<Record<VehicleCategoryType, CatState>>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    getAgencyVehicleCategories(agencyId).then(rows => {
      const init: Partial<Record<VehicleCategoryType, CatState>> = {}
      for (const row of rows) {
        init[row.category] = {
          id:                  row.id,
          available:           row.available,
          stock_estimate:      row.stock_estimate,
          daily_rate:          row.daily_rate,
          deposit:             row.deposit,
          included_km_per_day: row.included_km_per_day,
          extra_km_price:      row.extra_km_price,
          packages:            row.packages?.length ? row.packages : DEFAULT_PACKAGES,
        }
      }
      setState(init)
      setLoading(false)
    })
  }, [agencyId])

  const toggle = (cat: VehicleCategoryType) =>
    setState(prev => {
      const existing = prev[cat]
      return existing
        ? { ...prev, [cat]: { ...existing, available: !existing.available } }
        : { ...prev, [cat]: { ...DEFAULT_CAT } }
    })

  const updCat = (cat: VehicleCategoryType, patch: Partial<CatState>) =>
    setState(prev => ({ ...prev, [cat]: { ...prev[cat]!, ...patch } }))

  const updPackagePrice = (cat: VehicleCategoryType, idx: number, price: number) => {
    const pkgs = [...(state[cat]?.packages ?? DEFAULT_PACKAGES)]
    pkgs[idx] = { ...pkgs[idx], price }
    updCat(cat, { packages: pkgs })
  }

  const handleSave = async () => {
    setSaving(true)
    for (const [cat, s] of Object.entries(state) as [VehicleCategoryType, CatState][]) {
      if (!s.available && !s.id) continue
      const result = await upsertAgencyVehicleCategory(agencyId, {
        id:                  s.id,
        category:            cat,
        group_type:          VEHICLE_CATEGORY_GROUPS[cat],
        available:           s.available,
        stock_estimate:      s.stock_estimate,
        daily_rate:          s.daily_rate,
        deposit:             s.deposit,
        included_km_per_day: s.included_km_per_day,
        extra_km_price:      s.extra_km_price,
        packages:            s.packages,
      })
      if (result && !s.id) updCat(cat, { id: result.id })
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  }

  const groups: { title: string; cats: VehicleCategoryType[] }[] = [
    { title: 'Véhicules de tourisme', cats: TOURISME_CATEGORIES },
    { title: 'Véhicules utilitaires', cats: UTILITAIRE_CATEGORIES },
  ]

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ title, cats }) => (
        <div key={title}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
          <div className="flex flex-col gap-2">
            {cats.map(cat => {
              const s = state[cat]
              const on = s?.available === true
              return (
                <div key={cat} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className={['flex items-center gap-3 px-4 py-3', on ? 'bg-white' : 'bg-slate-50'].join(' ')}>
                    <button type="button" onClick={() => toggle(cat)} className="shrink-0">
                      {on
                        ? <ToggleRight className="w-5 h-5 text-brand-500" />
                        : <ToggleLeft  className="w-5 h-5 text-slate-300" />}
                    </button>
                    <span className={['flex-1 text-sm font-medium', on ? 'text-slate-800' : 'text-slate-400'].join(' ')}>
                      {VEHICLE_CATEGORY_LABELS[cat]}
                    </span>
                    {on && s && s.daily_rate > 0 && (
                      <span className="text-xs font-semibold text-brand-600">{s.daily_rate} €/j</span>
                    )}
                  </div>

                  {on && s && (
                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-white">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className={labelCls}>Stock estimé</label>
                          <input type="number" min="0" className={inputCls}
                            value={s.stock_estimate}
                            onChange={e => updCat(cat, { stock_estimate: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className={labelCls}>Tarif / jour (€)</label>
                          <input type="number" min="0" step="0.01" className={inputCls}
                            value={s.daily_rate}
                            onChange={e => updCat(cat, { daily_rate: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className={labelCls}>Caution (€)</label>
                          <input type="number" min="0" step="0.01" className={inputCls}
                            value={s.deposit}
                            onChange={e => updCat(cat, { deposit: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className={labelCls}>Km inclus / jour</label>
                          <input type="number" min="0" className={inputCls}
                            value={s.included_km_per_day}
                            onChange={e => updCat(cat, { included_km_per_day: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className={labelCls}>Km supp. (€/km)</label>
                          <input type="number" min="0" step="0.01" className={inputCls}
                            value={s.extra_km_price}
                            onChange={e => updCat(cat, { extra_km_price: Number(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Forfaits</p>
                      <div className="grid grid-cols-3 gap-3">
                        {s.packages.map((pkg, idx) => (
                          <div key={idx}>
                            <label className={labelCls}>{pkg.label} (€)</label>
                            <input type="number" min="0" step="0.01" className={inputCls}
                              value={pkg.price}
                              onChange={e => updPackagePrice(cat, idx, Number(e.target.value) || 0)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Enregistrer les catégories
        </button>
      </div>
    </div>
  )
}

// ── AgencyCard ────────────────────────────────────────────────────────────────

type AgencyTab = 'infos' | 'services' | 'categories'

const AGENCY_TABS: { key: AgencyTab; label: string }[] = [
  { key: 'infos',      label: 'Infos' },
  { key: 'services',   label: 'Services' },
  { key: 'categories', label: 'Catégories & Tarifs' },
]

function AgencyCard({
  agency, onUpdate, onDelete, deleting,
}: {
  agency:   RentalAgencyRow
  onUpdate: (id: string, input: AgencyInput) => Promise<void>
  onDelete: (id: string) => void
  deleting: boolean
}) {
  const [tab,     setTab]     = useState<AgencyTab>('infos')
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const handleSave = async (input: AgencyInput) => {
    setSaving(true)
    await onUpdate(agency.id, input)
    setEditing(false)
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-black text-slate-900">{agency.agency_name}</p>
            <span className={[
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              agency.is_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
            ].join(' ')}>
              {agency.is_available ? 'Disponible' : 'Indisponible'}
            </span>
          </div>
          {agency.company_name && <p className="text-sm text-slate-500 mt-0.5">{agency.company_name}</p>}
        </div>
        <button
          onClick={() => onDelete(agency.id)}
          disabled={deleting}
          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-5 mt-3">
        {AGENCY_TABS.map(t => (
          <button key={t.key}
            onClick={() => { setTab(t.key); setEditing(false) }}
            className={[
              'px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all whitespace-nowrap',
              tab === t.key
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {tab === 'infos' && (
          editing
            ? <AgencyForm
                initial={{
                  agency_name: agency.agency_name, company_name: agency.company_name,
                  email: agency.email, phone: agency.phone, address: agency.address,
                  city: agency.city, postal_code: agency.postal_code,
                  service_radius_km: agency.service_radius_km, contact_name: agency.contact_name,
                  is_available: agency.is_available,
                  opening_hours_weekdays: agency.opening_hours_weekdays,
                  opening_hours_saturday: agency.opening_hours_saturday,
                  opening_hours_sunday: agency.opening_hours_sunday,
                }}
                onSave={handleSave}
                onCancel={() => setEditing(false)}
                saving={saving}
              />
            : <AgencyInfoView agency={agency} onEdit={() => setEditing(true)} />
        )}
        {tab === 'services'   && <AgencyServicesPanel   agencyId={agency.id} />}
        {tab === 'categories' && <AgencyCategoriesPanel agencyId={agency.id} />}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoueurProfilPage() {
  const [agencies,   setAgencies]      = useState<RentalAgencyRow[] | null>(null)
  const [session,    setSessionState]  = useState<MockSession | null>(null)
  const [loading,    setLoading]       = useState(true)
  const [creating,   setCreating]      = useState(false)
  const [savingNew,  setSavingNew]     = useState(false)
  const [deletingId, setDeletingId]    = useState<string | null>(null)

  useEffect(() => {
    setSessionState(getSession())
    getMyAgencies().then(data => { setAgencies(data); setLoading(false) })
  }, [])

  const handleCreate = useCallback(async (input: AgencyInput) => {
    setSavingNew(true)
    const created = await createAgency(input)
    if (created) setAgencies(prev => [...(prev ?? []), created])
    setCreating(false)
    setSavingNew(false)
  }, [])

  const handleUpdate = useCallback(async (id: string, input: AgencyInput) => {
    const updated = await updateAgency(id, input)
    if (updated) setAgencies(prev => (prev ?? []).map(a => a.id === id ? updated : a))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Supprimer cette agence ?')) return
    setDeletingId(id)
    const ok = await deleteAgency(id)
    if (ok) setAgencies(prev => (prev ?? []).filter(a => a.id !== id))
    setDeletingId(null)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">

      <div>
        <h1 className="text-2xl font-black text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gérez vos agences et informations partenaire</p>
      </div>

      {session && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Compte</p>
          <p className="text-base font-black text-slate-900">{session.userName}</p>
          {session.company && <p className="text-sm text-slate-500">{session.company}</p>}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-bold text-slate-800">Mes agences</h2>
            {agencies && agencies.length > 0 && (
              <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {agencies.length}
              </span>
            )}
          </div>
          {!creating && (
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ajouter une agence
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">

          {creating && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-bold text-slate-700 mb-4">Nouvelle agence</p>
              <AgencyForm
                initial={EMPTY_INPUT}
                onSave={handleCreate}
                onCancel={() => setCreating(false)}
                saving={savingNew}
              />
            </div>
          )}

          {agencies && agencies.length === 0 && !creating && (
            <div className="flex flex-col items-center py-16 text-center gap-3 bg-white rounded-2xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Aucune agence ajoutée</p>
                <p className="text-sm text-slate-400 mt-1">Cliquez sur "Ajouter une agence" pour commencer.</p>
              </div>
            </div>
          )}

          {agencies?.map(agency => (
            <AgencyCard
              key={agency.id}
              agency={agency}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              deleting={deletingId === agency.id}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
