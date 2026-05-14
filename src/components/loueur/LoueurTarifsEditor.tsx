'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getAgencyVehicleCategories,
  saveLoueurTarifs,
  type AgencyVehicleCategoryRow,
  type LoueurTarifInput,
} from '@/services/agencyVehicleCategoriesService'
import { getMyAgencies } from '@/services/rentalAgencyService'
import type { RentalAgencyRow } from '@/services/rentalAgencyService'
import {
  TOURISME_CATEGORIES, UTILITAIRE_CATEGORIES,
  VEHICLE_CATEGORY_LABELS, VEHICLE_CATEGORY_GROUPS,
  type VehicleCategoryType,
} from '@/types/vehicleCategory'

// ── Types locaux ──────────────────────────────────────────────────────────────

type Draft = {
  id?:              string
  modeleEquivalent: string
  tarif1_4:         string
  tarif5_7:         string
  tarif8_14:        string
  tarif15_21:       string
  tarif22_29:       string
  forfait30Jours:   string
  includedKmPerDay: string
  extraKmPrice:     string
  actif:            boolean
}

const EMPTY: Draft = {
  modeleEquivalent: '', tarif1_4: '', tarif5_7: '', tarif8_14: '',
  tarif15_21: '', tarif22_29: '', forfait30Jours: '',
  includedKmPerDay: '', extraKmPrice: '', actif: true,
}

function rowToDraft(row: AgencyVehicleCategoryRow): Draft {
  const s = (v: number | null | undefined) => (v != null ? String(v) : '')
  return {
    id:               row.id,
    modeleEquivalent: row.modele_equivalent ?? '',
    tarif1_4:         s(row.tarif_1_4),
    tarif5_7:         s(row.tarif_5_7),
    tarif8_14:        s(row.tarif_8_14),
    tarif15_21:       s(row.tarif_15_21),
    tarif22_29:       s(row.tarif_22_29),
    forfait30Jours:   s(row.forfait_30_jours),
    includedKmPerDay: s(row.included_km_per_day || null),
    extraKmPrice:     s(row.extra_km_price || null),
    actif:            row.actif ?? true,
  }
}

function draftToInput(draft: Draft, cat: VehicleCategoryType): LoueurTarifInput {
  const n = (v: string): number | null => v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null
  return {
    id:                  draft.id,
    category:            cat,
    group_type:          VEHICLE_CATEGORY_GROUPS[cat],
    modele_equivalent:   draft.modeleEquivalent.trim() || null,
    tarif_1_4:           n(draft.tarif1_4),
    tarif_5_7:           n(draft.tarif5_7),
    tarif_8_14:          n(draft.tarif8_14),
    tarif_15_21:         n(draft.tarif15_21),
    tarif_22_29:         n(draft.tarif22_29),
    forfait_30_jours:    n(draft.forfait30Jours),
    included_km_per_day: n(draft.includedKmPerDay) ?? 0,
    extra_km_price:      n(draft.extraKmPrice)      ?? 0,
    actif:               draft.actif,
  }
}

// ── Aperçu gain ───────────────────────────────────────────────────────────────

const PREVIEW_ROWS = [
  { days: 3,  label: '3 jours',  bracket: 'Tranche 1–4j'  },
  { days: 7,  label: '7 jours',  bracket: 'Tranche 5–7j'  },
  { days: 14, label: '14 jours', bracket: 'Tranche 8–14j' },
  { days: 21, label: '21 jours', bracket: 'Tranche 15–21j'},
  { days: 29, label: '29 jours', bracket: 'Tranche 22–29j'},
  { days: 30, label: '30 jours', bracket: 'Forfait 30j'   },
]

function r2(n: number): number { return Math.round(n * 100) / 100 }

function previewTotal(d: Draft, days: number): number | null {
  const n = (s: string) => s.trim() !== '' && !isNaN(Number(s)) ? Number(s) : undefined
  if (days >= 30) { const t = n(d.forfait30Jours); return t ?? null }
  if (days >= 22) { const t = n(d.tarif22_29);    return t != null ? r2(t * days) : null }
  if (days >= 15) { const t = n(d.tarif15_21);    return t != null ? r2(t * days) : null }
  if (days >= 8)  { const t = n(d.tarif8_14);     return t != null ? r2(t * days) : null }
  if (days >= 5)  { const t = n(d.tarif5_7);      return t != null ? r2(t * days) : null }
  const t = n(d.tarif1_4); return t != null ? r2(t * days) : null
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all'
const labelCls = 'block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1'

// ── CategoryRow ───────────────────────────────────────────────────────────────

function CategoryRow({
  cat,
  draft,
  saving,
  onChange,
  onSave,
}: {
  cat:      VehicleCategoryType
  draft:    Draft
  saving:   boolean
  onChange: (patch: Partial<Draft>) => void
  onSave:   () => void
}) {
  const [open, setOpen] = useState(false)

  const hasAnyTarif = [
    draft.tarif1_4, draft.tarif5_7, draft.tarif8_14,
    draft.tarif15_21, draft.tarif22_29, draft.forfait30Jours,
  ].some(v => v.trim() !== '')

  const firstTarif = draft.tarif1_4 || draft.tarif5_7 || draft.tarif8_14 || ''

  return (
    <div className={`rounded-2xl border overflow-hidden ${draft.actif ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onChange({ actif: !draft.actif })}
          className="shrink-0"
          title={draft.actif ? 'Désactiver' : 'Activer'}
        >
          {draft.actif
            ? <ToggleRight className="w-5 h-5 text-brand-500" />
            : <ToggleLeft  className="w-5 h-5 text-slate-300" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${draft.actif ? 'text-slate-800' : 'text-slate-400'}`}>
            {VEHICLE_CATEGORY_LABELS[cat]}
          </p>
          {draft.modeleEquivalent && (
            <p className="text-xs text-slate-400 truncate">{draft.modeleEquivalent}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasAnyTarif && firstTarif && (
            <span className="text-xs font-semibold text-brand-600 tabular-nums">
              {firstTarif} €/j
            </span>
          )}
          {!hasAnyTarif && (
            <span className="text-xs text-slate-300 italic">Non configuré</span>
          )}
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded form */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-5">

          {/* Modèle équivalent */}
          <div>
            <label className={labelCls}>Modèle ou équivalent</label>
            <input
              type="text"
              value={draft.modeleEquivalent}
              onChange={e => onChange({ modeleEquivalent: e.target.value })}
              placeholder="ex. Peugeot 3008, Toyota Yaris…"
              className={inputCls}
            />
          </div>

          {/* Grille tarifaire */}
          <div>
            <p className={labelCls}>Tarifs HT / jour (par tranche)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'tarif1_4',      label: '1–4 jours',   suffix: '€/j' },
                { key: 'tarif5_7',      label: '5–7 jours',   suffix: '€/j' },
                { key: 'tarif8_14',     label: '8–14 jours',  suffix: '€/j' },
                { key: 'tarif15_21',    label: '15–21 jours', suffix: '€/j' },
                { key: 'tarif22_29',    label: '22–29 jours', suffix: '€/j' },
                { key: 'forfait30Jours',label: 'Forfait 30j', suffix: '€ total' },
              ].map(({ key, label, suffix }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={draft[key as keyof Draft] as string}
                      onChange={e => onChange({ [key]: e.target.value })}
                      placeholder="—"
                      className={`${inputCls} pr-14`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      {suffix}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kilométrage */}
          <div>
            <p className={labelCls}>Kilométrage</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Km inclus / jour</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={draft.includedKmPerDay}
                    onChange={e => onChange({ includedKmPerDay: e.target.value })}
                    placeholder="—"
                    className={`${inputCls} pr-10`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">km</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Prix km supplémentaire HT</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={draft.extraKmPrice}
                    onChange={e => onChange({ extraKmPrice: e.target.value })}
                    placeholder="—"
                    className={`${inputCls} pr-14`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">€/km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu gain net */}
          {hasAnyTarif && (
            <div>
              <p className={labelCls}>Aperçu gain net (commission DRIVES ON 15 %)</p>
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400">
                      <th className="text-left px-3 py-2 font-semibold">Durée</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-300 hidden sm:table-cell">Tranche</th>
                      <th className="text-right px-3 py-2 font-semibold">Total HT</th>
                      <th className="text-right px-3 py-2 font-semibold">Commission</th>
                      <th className="text-right px-3 py-2 font-semibold text-green-700">Gain net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {PREVIEW_ROWS.map(({ days, label, bracket }) => {
                      const total      = previewTotal(draft, days)
                      const commission = total != null ? r2(total * 0.15) : null
                      const net        = total != null ? r2(total - commission!) : null
                      return (
                        <tr key={days} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-semibold text-slate-700">{label}</td>
                          <td className="px-3 py-2 text-slate-300 hidden sm:table-cell">{bracket}</td>
                          <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                            {total != null ? `${total} €` : <span className="text-slate-200">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-400 tabular-nums">
                            {commission != null ? `− ${commission} €` : <span className="text-slate-200">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-black tabular-nums text-green-700">
                            {net != null ? `${net} € HT` : <span className="text-slate-200 font-normal">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {saving
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Check    className="w-3.5 h-3.5" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Groupes ───────────────────────────────────────────────────────────────────

const GROUPS = [
  { title: 'Véhicules de tourisme',   cats: TOURISME_CATEGORIES   },
  { title: 'Véhicules utilitaires',   cats: UTILITAIRE_CATEGORIES },
]

// ── Panel par agence ──────────────────────────────────────────────────────────

function AgencyTarifsPanel({ agencyId }: { agencyId: string }) {
  const [drafts,  setDrafts]  = useState<Partial<Record<VehicleCategoryType, Draft>>>({})
  const [saving,  setSaving]  = useState<VehicleCategoryType | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState<string | null>(null)

  useEffect(() => {
    getAgencyVehicleCategories(agencyId).then(rows => {
      const init: Partial<Record<VehicleCategoryType, Draft>> = {}
      for (const row of rows) init[row.category] = rowToDraft(row)
      setDrafts(init)
      setLoading(false)
    })
  }, [agencyId])

  const handleChange = useCallback((cat: VehicleCategoryType, patch: Partial<Draft>) => {
    setDrafts(prev => ({ ...prev, [cat]: { ...(prev[cat] ?? EMPTY), ...patch } }))
  }, [])

  const handleSave = useCallback(async (cat: VehicleCategoryType) => {
    const draft = drafts[cat] ?? EMPTY
    setSaving(cat)
    const input = draftToInput(draft, cat)
    const result = await saveLoueurTarifs(agencyId, input)
    if (result) {
      setDrafts(prev => ({ ...prev, [cat]: rowToDraft(result) }))
      setToast('Tarifs enregistrés')
      setTimeout(() => setToast(null), 2500)
    }
    setSaving(null)
  }, [agencyId, drafts])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 relative">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}

      {GROUPS.map(({ title, cats }) => (
        <div key={title}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
          <div className="flex flex-col gap-2">
            {cats.map(cat => (
              <CategoryRow
                key={cat}
                cat={cat}
                draft={drafts[cat] ?? EMPTY}
                saving={saving === cat}
                onChange={patch => handleChange(cat, patch)}
                onSave={() => handleSave(cat)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function LoueurTarifsEditor() {
  const [agencies,    setAgencies]    = useState<RentalAgencyRow[] | null>(null)
  const [agencyId,    setAgencyId]    = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    getMyAgencies().then(data => {
      setAgencies(data)
      if (data.length > 0) setAgencyId(data[0].id)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-2xl" />)}
      </div>
    )
  }

  if (!agencies || agencies.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center gap-3">
        <p className="font-semibold text-slate-700">Aucune agence configurée</p>
        <p className="text-sm text-slate-400">
          Ajoutez d'abord une agence dans{' '}
          <a href="/loueur/profil" className="text-brand-500 underline underline-offset-2">Mon profil</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Mes tarifs</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Définissez votre grille tarifaire par catégorie de véhicule et durée de location.
        </p>
      </div>

      {/* Sélecteur d'agence si multiple */}
      {agencies.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Agence</label>
          <select
            value={agencyId ?? ''}
            onChange={e => setAgencyId(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 bg-white"
          >
            {agencies.map(a => (
              <option key={a.id} value={a.id}>{a.agency_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Note explicative */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700">
        <strong>Règle de calcul :</strong> le tarif de la tranche correspondante s'applique × nombre de jours.
        Au-delà de 30 jours, le forfait est forfaitaire. Si une tranche est vide, le tarif journalier de base (Mon profil) est utilisé en fallback.
      </div>

      {agencyId && <AgencyTarifsPanel key={agencyId} agencyId={agencyId} />}
    </div>
  )
}
