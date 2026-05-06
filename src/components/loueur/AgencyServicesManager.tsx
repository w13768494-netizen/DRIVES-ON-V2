'use client'

import { useState } from 'react'
import { AGENCY_SERVICE_LABELS, SERVICE_PRICE_LABELS } from '@/types/agencyService'
import type { AgencyService, ServicePriceType } from '@/types/agencyService'

interface Props {
  services: AgencyService[]
  onUpdate: (serviceId: string, patch: Partial<AgencyService>) => Promise<void>
}

function ServiceRow({ service, onUpdate }: { service: AgencyService; onUpdate: Props['onUpdate'] }) {
  const [saving, setSaving] = useState(false)

  async function toggleAvailable() {
    setSaving(true)
    await onUpdate(service.id, { available: !service.available })
    setSaving(false)
  }

  async function changePriceType(priceType: ServicePriceType) {
    await onUpdate(service.id, { priceType, price: priceType !== 'fixe' ? undefined : service.price })
  }

  async function changePrice(price: number) {
    await onUpdate(service.id, { price })
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0 ${saving ? 'opacity-60' : ''}`}>
      {/* Toggle + Libellé */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={service.available}
            onChange={toggleAvailable}
            disabled={saving}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-checked:bg-green-500 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-brand-400 relative">
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
        </label>
        <span className={`text-sm font-medium truncate ${service.available ? 'text-slate-800' : 'text-slate-400'}`}>
          {AGENCY_SERVICE_LABELS[service.type]}
        </span>
      </div>

      {/* Type de prix */}
      {service.available && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={service.priceType}
            onChange={e => changePriceType(e.target.value as ServicePriceType)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
          >
            {(Object.keys(SERVICE_PRICE_LABELS) as ServicePriceType[]).map(pt => (
              <option key={pt} value={pt}>{SERVICE_PRICE_LABELS[pt]}</option>
            ))}
          </select>
          {service.priceType === 'fixe' && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                defaultValue={service.price ?? 0}
                onBlur={e => changePrice(Number(e.target.value))}
                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="0"
              />
              <span className="text-xs text-slate-400">€</span>
            </div>
          )}
          {service.comment && (
            <span className="text-xs text-slate-400 italic truncate max-w-[200px]">{service.comment}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function AgencyServicesManager({ services, onUpdate }: Props) {
  if (services.length === 0) {
    return <p className="text-sm text-slate-400 italic">Aucun service configuré.</p>
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-2">
      {services.map(service => (
        <ServiceRow key={service.id} service={service} onUpdate={onUpdate} />
      ))}
    </div>
  )
}
