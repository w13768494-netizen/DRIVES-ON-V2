'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { AgencyForm } from './AgencyForm'
import { RentalAgencyCard } from './RentalAgencyCard'
import type { RentalAgency } from '@/types/rentalAgency'

type Mode = { type: 'list' } | { type: 'add' } | { type: 'edit'; agency: RentalAgency }
type DeleteState = { agencyId: string; confirming: boolean; deleting: boolean } | null

interface Props {
  agencies:        RentalAgency[]
  brandId:         string
  activeAgencyId:  string | null
  onSelect:        (id: string) => void
  onCreate:        (data: Omit<RentalAgency, 'id'>) => Promise<RentalAgency>
  onUpdate:        (id: string, patch: Partial<RentalAgency>) => Promise<void>
  onDelete:        (id: string) => Promise<void>
}

export function AgencyManager({
  agencies, brandId, activeAgencyId, onSelect, onCreate, onUpdate, onDelete,
}: Props) {
  const [mode, setMode]         = useState<Mode>({ type: 'list' })
  const [deleteState, setDelete] = useState<DeleteState>(null)

  async function handleCreate(data: Omit<RentalAgency, 'id'>) {
    const agency = await onCreate(data)
    setMode({ type: 'list' })
    onSelect(agency.id)
  }

  async function handleUpdate(id: string, data: Omit<RentalAgency, 'id'>) {
    await onUpdate(id, data)
    setMode({ type: 'list' })
  }

  async function handleDelete(id: string) {
    setDelete({ agencyId: id, confirming: false, deleting: true })
    await onDelete(id)
    setDelete(null)
    if (activeAgencyId === id && agencies.length > 1) {
      onSelect(agencies.find(a => a.id !== id)!.id)
    }
  }

  if (mode.type === 'add') {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Nouvelle agence</h3>
        <AgencyForm brandId={brandId} onSave={handleCreate} onCancel={() => setMode({ type: 'list' })} />
      </div>
    )
  }

  if (mode.type === 'edit') {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Modifier l'agence</h3>
        <AgencyForm
          initial={mode.agency}
          brandId={brandId}
          onSave={(data) => handleUpdate(mode.agency.id, data)}
          onCancel={() => setMode({ type: 'list' })}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {agencies.map(agency => {
          const ds = deleteState?.agencyId === agency.id ? deleteState : null

          return (
            <div key={agency.id} className="flex flex-col gap-2">
              <RentalAgencyCard
                agency={agency}
                active={agency.id === activeAgencyId}
                onClick={() => onSelect(agency.id)}
              />

              {/* Actions */}
              {ds?.confirming ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 flex-1">Supprimer cette agence et toutes ses données ?</p>
                  <button
                    onClick={() => handleDelete(agency.id)}
                    className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setDelete(null)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
                  >
                    Annuler
                  </button>
                </div>
              ) : ds?.deleting ? (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  <p className="text-xs text-slate-500">Suppression…</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode({ type: 'edit', agency })}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white rounded-xl py-2 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />Modifier
                  </button>
                  <button
                    onClick={() => setDelete({ agencyId: agency.id, confirming: true, deleting: false })}
                    className="flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 bg-white rounded-xl px-3 py-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setMode({ type: 'add' })}
        className="flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600 border border-brand-200 hover:border-brand-300 bg-brand-50 hover:bg-brand-100 rounded-xl px-4 py-2.5 transition-colors w-fit"
      >
        <Plus className="w-4 h-4" />
        Ajouter une agence
      </button>
    </div>
  )
}
