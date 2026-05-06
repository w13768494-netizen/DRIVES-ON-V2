'use client'

import { Trash2, Plus } from 'lucide-react'
import type { PricingPackage } from '@/types/vehicleCategory'

interface Props {
  packages:  PricingPackage[]
  onChange:  (packages: PricingPackage[]) => void
  disabled?: boolean
}

export function PricingPackageEditor({ packages, onChange, disabled }: Props) {
  function update(index: number, field: keyof PricingPackage, value: string | number) {
    const updated = packages.map((pkg, i) =>
      i === index ? { ...pkg, [field]: typeof value === 'string' && field !== 'label' ? Number(value) : value } : pkg
    )
    onChange(updated)
  }

  function remove(index: number) {
    onChange(packages.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...packages, { label: '', days: 1, price: 0 }])
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-slate-500">Forfaits</p>
      <div className="flex flex-col gap-2">
        {packages.map((pkg, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={pkg.label}
              onChange={e => update(i, 'label', e.target.value)}
              disabled={disabled}
              placeholder="Libellé (ex. Week-end)"
              className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:bg-slate-50"
            />
            <input
              type="number"
              value={pkg.days}
              onChange={e => update(i, 'days', e.target.value)}
              disabled={disabled}
              placeholder="Jours"
              className="w-16 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:bg-slate-50"
            />
            <input
              type="number"
              value={pkg.price}
              onChange={e => update(i, 'price', e.target.value)}
              disabled={disabled}
              placeholder="Prix €"
              className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:bg-slate-50"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors disabled:opacity-40 w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un forfait
        </button>
      </div>
    </div>
  )
}
