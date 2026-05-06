'use client'

import { useState } from 'react'
import { ArrowRightLeft, CheckCheck, ThumbsDown, Loader2, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { RequestTransfer } from '@/types/requestTransfer'

interface Props {
  transfer:        RequestTransfer
  onValidate:      () => Promise<void>
  onRefuse:        () => Promise<void>
}

export function TransferProposalCard({ transfer, onValidate, onRefuse }: Props) {
  const [validating, setValidating] = useState(false)
  const [refusing,   setRefusing]   = useState(false)

  async function handleValidate() {
    setValidating(true)
    try { await onValidate() } finally { setValidating(false) }
  }

  async function handleRefuse() {
    if (!confirm('Refuser ce transfert ? La demande restera chez le loueur actuel.')) return
    setRefusing(true)
    try { await onRefuse() } finally { setRefusing(false) }
  }

  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-orange-700">
        <ArrowRightLeft className="w-5 h-5 shrink-0" />
        <p className="font-semibold">Transfert proposé par le loueur</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 border border-orange-100">
          <p className="text-xs text-slate-400 mb-1">De</p>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p className="text-sm font-semibold text-slate-800">{transfer.fromAgencyName}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-orange-100">
          <p className="text-xs text-slate-400 mb-1">Vers</p>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <p className="text-sm font-semibold text-slate-800">{transfer.toAgencyName}</p>
          </div>
        </div>
      </div>

      {transfer.reason && (
        <div className="bg-white rounded-xl p-3 border border-orange-100">
          <p className="text-xs text-slate-400 mb-1">Motif</p>
          <p className="text-sm text-slate-700">"{transfer.reason}"</p>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Proposé le {format(transfer.proposedAt, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
      </p>

      {transfer.status === 'en_attente' && (
        <div className="flex gap-3">
          <button
            onClick={handleRefuse}
            disabled={validating || refusing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {refusing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ThumbsDown className="w-4 h-4" />
            }
            Refuser
          </button>
          <button
            onClick={handleValidate}
            disabled={validating || refusing}
            className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            {validating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCheck className="w-4 h-4" />
            }
            Valider le transfert
          </button>
        </div>
      )}

      {transfer.status === 'valide' && (
        <div className="flex items-center gap-2 text-orange-600 text-sm font-semibold">
          <CheckCheck className="w-4 h-4" />
          Transfert validé
        </div>
      )}

      {transfer.status === 'refuse' && (
        <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
          <ThumbsDown className="w-4 h-4" />
          Transfert refusé
        </div>
      )}
    </div>
  )
}
