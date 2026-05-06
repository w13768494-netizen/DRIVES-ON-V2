'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { PricingPackageEditor } from './PricingPackageEditor'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { VehicleCategoryOffer } from '@/types/vehicleCategory'

interface Props {
  offers:   VehicleCategoryOffer[]
  onUpdate: (offerId: string, patch: Partial<VehicleCategoryOffer>) => Promise<void>
}

function CategoryOfferRow({ offer, onUpdate }: { offer: VehicleCategoryOffer; onUpdate: Props['onUpdate'] }) {
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [draft, setDraft]       = useState<VehicleCategoryOffer>(offer)

  async function save() {
    setSaving(true)
    await onUpdate(offer.id, draft)
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setDraft(offer)
    setEditing(false)
  }

  function field(key: keyof VehicleCategoryOffer) {
    return (value: string | number | boolean) =>
      setDraft(d => ({ ...d, [key]: value }))
  }

  return (
    <div className={`border rounded-2xl p-4 transition-colors ${draft.available ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={draft.available}
              onChange={e => {
                field('available')(e.target.checked)
                if (!editing) onUpdate(offer.id, { available: e.target.checked })
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-checked:bg-green-500 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-brand-400">
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
          </label>
          <span className="text-sm font-semibold text-slate-800">
            {VEHICLE_CATEGORY_LABELS[offer.category]}
          </span>
          {!draft.available && <span className="text-xs text-slate-400">(indisponible)</span>}
        </div>
        <div className="flex gap-1">
          {editing ? (
            <>
              <button onClick={save} disabled={saving}
                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancel}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Tarif/jour (€)</label>
              <input type="number" value={draft.dailyRate}
                onChange={e => setDraft(d => ({ ...d, dailyRate: Number(e.target.value) }))}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Caution (€)</label>
              <input type="number" value={draft.deposit}
                onChange={e => setDraft(d => ({ ...d, deposit: Number(e.target.value) }))}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Km inclus/j</label>
              <input type="number" value={draft.includedKmPerDay}
                onChange={e => setDraft(d => ({ ...d, includedKmPerDay: Number(e.target.value) }))}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Km suppl. (€)</label>
              <input type="number" step="0.01" value={draft.extraKmPrice}
                onChange={e => setDraft(d => ({ ...d, extraKmPrice: Number(e.target.value) }))}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Stock estimé</label>
            <input type="number" value={draft.stockEstimate}
              onChange={e => setDraft(d => ({ ...d, stockEstimate: Number(e.target.value) }))}
              className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
          </div>
          <PricingPackageEditor
            packages={draft.packages}
            onChange={pkgs => setDraft(d => ({ ...d, packages: pkgs }))}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span><strong className="text-slate-700">{offer.dailyRate} €/j</strong></span>
          <span>Caution : {offer.deposit} €</span>
          <span>{offer.includedKmPerDay} km/j inclus</span>
          {offer.extraKmPrice > 0 && <span>{offer.extraKmPrice} €/km suppl.</span>}
          <span>Stock : {offer.stockEstimate}</span>
          {offer.packages.map(pkg => (
            <span key={pkg.label}>{pkg.label} : {pkg.price} €</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function VehicleCategoryPricingManager({ offers, onUpdate }: Props) {
  if (offers.length === 0) {
    return <p className="text-sm text-slate-400 italic">Aucune catégorie configurée.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {offers.map(offer => (
        <CategoryOfferRow key={offer.id} offer={offer} onUpdate={onUpdate} />
      ))}
    </div>
  )
}
