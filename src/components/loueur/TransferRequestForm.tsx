'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft, Loader2, Building2 } from 'lucide-react'
import { getNearbyAgenciesForTransfer } from '@/services/loueurService'
import type { RentalAgency } from '@/types/rentalAgency'
import type { LoueurAction } from '@/types/loueur'

interface Props {
  requestId:  string
  onSubmit:   (action: LoueurAction) => Promise<void>
  disabled?:  boolean
}

export function TransferRequestForm({ requestId, onSubmit, disabled }: Props) {
  const [agencies, setAgencies]     = useState<RentalAgency[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason]         = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getNearbyAgenciesForTransfer(requestId).then(list => {
      setAgencies(list)
      setLoading(false)
    })
  }, [requestId])

  async function handleSubmit() {
    const agency = agencies.find(a => a.id === selectedId)
    if (!agency) return
    setSubmitting(true)
    try {
      await onSubmit({
        type:          'transferer',
        toAgencyId:    agency.id,
        toAgencyName:  agency.name,
        message:       reason || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Recherche des agences proches…
      </div>
    )
  }

  if (agencies.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic py-2">
        Aucune autre agence disponible dans le secteur.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-600">Transférer vers</label>
        <div className="flex flex-col gap-2">
          {agencies.map(agency => (
            <label
              key={agency.id}
              className={[
                'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                selectedId === agency.id
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-orange-300',
              ].join(' ')}
            >
              <input
                type="radio"
                name="transfer-agency"
                value={agency.id}
                checked={selectedId === agency.id}
                onChange={() => setSelectedId(agency.id)}
                className="accent-orange-500 shrink-0"
              />
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{agency.name}</p>
                  <p className="text-xs text-slate-500">{agency.city} · {agency.phone}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Motif du transfert (optionnel)</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          placeholder="Ex. : flotte SUV indisponible cette semaine…"
        />
      </div>

      <button
        type="button"
        disabled={!selectedId || submitting || disabled}
        onClick={handleSubmit}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm disabled:opacity-60 transition-colors"
      >
        {submitting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <ArrowRightLeft className="w-4 h-4" />
        }
        Proposer le transfert
      </button>
    </div>
  )
}
