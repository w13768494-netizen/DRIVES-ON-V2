'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, PlusCircle, Loader2, Tag, AlertTriangle, CalendarX2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { requestExtension } from '@/services/requestService'
import { getExtensionPricing } from '@/lib/extensionPricing'
import { getEffectiveDuration } from '@/types/request'
import { getEndDate, getExtensionDeadline, getRentalAlertState } from '@/lib/rentalDates'
import type { AssistanceRequest } from '@/types/request'
import type { ExtensionRequest } from '@/types/requestExtension'
import type { PricingOption } from '@/lib/extensionPricing'

interface Props {
  request:   AssistanceRequest
  onUpdated: (req: AssistanceRequest) => void
}

export function ExtensionSection({ request, onUpdated }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [days, setDays]         = useState('')
  const [note, setNote]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<'daily' | 'forfait'>('daily')

  const extensions    = request.extensions ?? []
  const pendingExt    = extensions.find(e => e.status === 'en_attente')
  const effectiveDays = getEffectiveDuration(request)
  const endDate       = getEndDate(request)
  const extDeadline   = getExtensionDeadline(request)
  const alertState    = getRentalAlertState(request)

  const pricing = useMemo(
    () => (days && Number(days) > 0 ? getExtensionPricing(request, Number(days)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request.id, request.loueurResponse, request.confirmedAgencyId, request.extensions, days],
  )

  useEffect(() => {
    if (pricing) setSelected(pricing.recommended)
  }, [pricing])

  function closeForm() {
    setShowForm(false)
    setDays('')
    setNote('')
  }

  async function handleSubmit() {
    const d = Number(days)
    if (!d || d <= 0) return
    setLoading(true)
    let chosenOption: PricingOption | undefined
    if (pricing) {
      chosenOption = selected === 'forfait' ? pricing.forfaitOption : pricing.dailyOption
    }
    const updated = await requestExtension(request.id, d, note || undefined, chosenOption)
    if (updated) { onUpdated(updated); closeForm() }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 font-semibold text-orange-700">
          <CalendarPlus className="w-5 h-5" />
          Prolongation de location
        </div>
        <span className="text-sm font-bold text-orange-700">
          {effectiveDays} jour{effectiveDays > 1 ? 's' : ''} au total
          {effectiveDays > request.durationDays && (
            <span className="ml-1.5 text-xs font-normal text-orange-500">
              (initial : {request.durationDays}j)
            </span>
          )}
        </span>
      </div>

      {/* Dates : fin + deadline */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-orange-200 rounded-lg px-2.5 py-1.5">
          <CalendarX2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span>Fin : <strong>{format(endDate, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}</strong></span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border ${
          alertState === 'overdue'           ? 'bg-red-50    border-red-300    text-red-700'
          : alertState === 'extension_urgent' ? 'bg-amber-50  border-amber-300  text-amber-700'
          :                                     'bg-white     border-orange-200  text-slate-600'
        }`}>
          {alertState !== 'none'
            ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            : <CalendarPlus  className="w-3.5 h-3.5 shrink-0 text-orange-400" />
          }
          <span>
            Deadline : <strong>{format(extDeadline, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}</strong>
            {alertState === 'overdue'           && ' — DÉPASSÉE (overdue)'}
            {alertState === 'extension_urgent'  && ' — URGENT'}
          </span>
        </div>
      </div>

      {/* Historique des prolongations */}
      {extensions.length > 0 && (
        <div className="flex flex-col gap-2">
          {extensions.map(ext => <ExtensionRow key={ext.id} ext={ext} />)}
        </div>
      )}

      {/* Bouton ou formulaire */}
      {!showForm ? (
        <button
          disabled={!!pendingExt}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          {pendingExt ? 'Prolongation en attente de réponse' : 'Demander une prolongation'}
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-4">

          {/* Saisie jours + aperçu durée */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                value={days}
                onChange={e => setDays(e.target.value)}
                placeholder="ex. 4"
                className="w-28 border border-slate-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">j</span>
            </div>
            <span className="text-xs text-slate-500">
              {days && Number(days) > 0
                ? `→ total : ${effectiveDays + Number(days)} jours`
                : 'jours supplémentaires'}
            </span>
          </div>

          {/* Choix tarifaire — affiché dès qu'on a un prix et des jours */}
          {pricing && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Option tarifaire
              </p>

              {/* Option journalière — toujours disponible */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                selected === 'daily'
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="pricingOption"
                  value="daily"
                  checked={selected === 'daily'}
                  onChange={() => setSelected('daily')}
                  className="mt-0.5 accent-orange-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">
                      Tarif journalier
                    </span>
                    {pricing.recommended === 'daily' && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        Recommandé
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    +{Number(days)}j × {pricing.dailyOption.pricePerDay} €/j
                    {' '}= <strong className="text-slate-700">+{pricing.dailyOption.extensionCost} €</strong>
                    <span className="ml-2 text-slate-400">
                      → total {pricing.dailyOption.newTotalPrice} €
                    </span>
                  </p>
                </div>
              </label>

              {/* Option forfait — uniquement si match exact sur la nouvelle durée totale */}
              {pricing.forfaitOption && (
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selected === 'forfait'
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="pricingOption"
                    value="forfait"
                    checked={selected === 'forfait'}
                    onChange={() => setSelected('forfait')}
                    className="mt-0.5 accent-orange-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800">
                        Forfait {pricing.forfaitOption.forfaitLabel}
                      </span>
                      {pricing.recommended === 'forfait' && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          Recommandé
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {pricing.forfaitOption.pricePerDay} €/j
                      {' '}= <strong className="text-slate-700">+{pricing.forfaitOption.extensionCost} €</strong>
                      <span className="ml-2 text-slate-400">
                        → total {pricing.forfaitOption.newTotalPrice} €
                      </span>
                    </p>
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Motif (optionnel) */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Motif de la prolongation (optionnel)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading || !days || Number(days) <= 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Envoyer au loueur
              {pricing && (
                <span className="opacity-90">
                  — +{(selected === 'forfait' ? pricing.forfaitOption?.extensionCost : pricing.dailyOption.extensionCost)} €
                </span>
              )}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_STYLES: Record<ExtensionRequest['status'], { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-amber-100 text-amber-700'  },
  acceptee:   { label: 'Acceptée',   cls: 'bg-green-100 text-green-700'  },
  refusee:    { label: 'Refusée',    cls: 'bg-red-100   text-red-700'    },
}

function ExtensionRow({ ext }: { ext: ExtensionRequest }) {
  const { label, cls } = STATUS_STYLES[ext.status]
  return (
    <div className="flex items-center gap-3 text-sm flex-wrap">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${cls}`}>{label}</span>
      <span className="font-medium text-slate-700">
        +{ext.requestedDays} jour{ext.requestedDays > 1 ? 's' : ''}
      </span>
      {ext.extensionCost !== undefined && (
        <span className={`text-xs font-semibold ${ext.status === 'acceptee' ? 'text-green-600' : 'text-slate-400'}`}>
          +{ext.extensionCost} €
          {ext.isForfait && ext.forfaitLabel && (
            <span className="ml-1 font-normal text-purple-600">(forfait {ext.forfaitLabel})</span>
          )}
        </span>
      )}
      {ext.note && (
        <span className="text-slate-400 italic truncate">"{ext.note}"</span>
      )}
      <span className="ml-auto text-xs text-slate-400 shrink-0">
        {format(new Date(ext.requestedAt), 'd MMM', { locale: fr })}
      </span>
    </div>
  )
}
