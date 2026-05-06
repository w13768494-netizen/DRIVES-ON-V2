'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import {
  AGENCY_SERVICE_LABELS, SERVICE_PRICE_LABELS, STANDARD_SERVICE_TYPES, getServiceLabel,
} from '@/types/agencyService'
import type { AgencyService, AgencyServiceType, ServicePriceType } from '@/types/agencyService'

interface Props {
  agencyId:  string
  services:  AgencyService[]
  onCreate:  (data: Omit<AgencyService, 'id'>) => Promise<AgencyService>
  onUpdate:  (id: string, patch: Partial<AgencyService>) => Promise<void>
  onDelete:  (id: string) => Promise<void>
}

function ServiceRow({
  service,
  canDelete,
  onUpdate,
  onDelete,
}: {
  service:   AgencyService
  canDelete: boolean
  onUpdate:  (patch: Partial<AgencyService>) => Promise<void>
  onDelete:  () => Promise<void>
}) {
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  async function toggle() {
    setSaving(true)
    await onUpdate({ available: !service.available })
    setSaving(false)
  }

  async function changePriceType(priceType: ServicePriceType) {
    await onUpdate({ priceType, price: priceType !== 'fixe' ? undefined : service.price })
  }

  async function changePrice(price: number) {
    await onUpdate({ price })
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <div className={`flex flex-col gap-2 py-3 border-b border-slate-100 last:border-0 transition-opacity ${saving || deleting ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Toggle */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" checked={service.available} onChange={toggle} disabled={saving} className="sr-only peer" />
          <div className="w-9 h-5 bg-slate-200 peer-checked:bg-green-500 rounded-full transition-colors relative">
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
        </label>

        {/* Label */}
        {service.type === 'custom' ? (
          <input
            type="text"
            defaultValue={service.label ?? ''}
            onBlur={e => onUpdate({ label: e.target.value })}
            placeholder="Libellé du service"
            className="flex-1 text-sm font-medium text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 min-w-0"
          />
        ) : (
          <span className={`text-sm font-medium flex-1 ${service.available ? 'text-slate-800' : 'text-slate-400'}`}>
            {getServiceLabel(service)}
          </span>
        )}

        {/* Prix + supprimer */}
        <div className="flex items-center gap-2 ml-auto">
          {service.available && (
            <>
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
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                  <span className="text-xs text-slate-400">€</span>
                </div>
              )}
            </>
          )}
          {canDelete && (
            confirmDel ? (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={deleting}
                  className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors">
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Oui'}
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg border border-slate-200">
                  Non
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {service.comment && (
        <p className="text-xs text-slate-400 italic ml-12">{service.comment}</p>
      )}
    </div>
  )
}

export function CustomServicesManager({ agencyId, services, onCreate, onUpdate, onDelete }: Props) {
  const [addingCustom, setAddingCustom] = useState(false)

  const standardServices = services.filter(s => s.type !== 'custom')
  const customServices   = services.filter(s => s.type === 'custom')

  // Services standard présents
  const presentStandardTypes = new Set(standardServices.map(s => s.type as Exclude<AgencyServiceType, 'custom'>))
  // Services standard manquants (pas encore configurés pour cette agence)
  const missingStandardTypes = STANDARD_SERVICE_TYPES.filter(t => !presentStandardTypes.has(t))

  async function addStandardService(type: Exclude<AgencyServiceType, 'custom'>) {
    await onCreate({ agencyId, type, available: false, priceType: 'inclus' })
  }

  async function addCustomService() {
    await onCreate({ agencyId, type: 'custom', label: '', available: true, priceType: 'inclus' })
    setAddingCustom(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Services standard */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-1">
        {standardServices.map(service => (
          <ServiceRow
            key={service.id}
            service={service}
            canDelete={false}
            onUpdate={(patch) => onUpdate(service.id, patch)}
            onDelete={() => onDelete(service.id)}
          />
        ))}
        {standardServices.length === 0 && (
          <p className="text-xs text-slate-400 italic py-4 text-center">Aucun service standard configuré.</p>
        )}
      </div>

      {/* Ajouter services standard manquants */}
      {missingStandardTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missingStandardTypes.map(type => (
            <button
              key={type}
              onClick={() => addStandardService(type)}
              className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + {AGENCY_SERVICE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {/* Services personnalisés */}
      {customServices.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Services personnalisés</p>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-1">
            {customServices.map(service => (
              <ServiceRow
                key={service.id}
                service={service}
                canDelete
                onUpdate={(patch) => onUpdate(service.id, patch)}
                onDelete={() => onDelete(service.id)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={addCustomService}
        className="flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-xl px-4 py-2.5 transition-colors w-fit"
      >
        <Plus className="w-4 h-4" />
        Ajouter un service personnalisé
      </button>
    </div>
  )
}
