'use client'

import { useState, useEffect } from 'react'
import { Check, X, ArrowRightLeft, Loader2, Tag, Info, Euro, ChevronDown } from 'lucide-react'
import { calculatePricing } from '@/lib/rentalPricing'
import { TransferRequestForm } from './TransferRequestForm'
import { getCategoryOffersByAgency, getServicesByAgency } from '@/services/agencyService'
import { AGENCY_SERVICE_LABELS } from '@/types/agencyService'
import type { AgencyService, AgencyServiceType } from '@/types/agencyService'
import type { VehicleCategoryOffer } from '@/types/vehicleCategory'
import type { LoueurAction, ReceivedRequest } from '@/types/loueur'

interface Props {
  request:   ReceivedRequest
  onSubmit:  (action: LoueurAction) => Promise<void>
  disabled?: boolean
}

function EarningsBreakdown({
  catalogPricePerDay,
  durationDays,
  requestedServices,
  agencyServices,
  dark = false,
}: {
  catalogPricePerDay?: number
  durationDays: number
  requestedServices?: AgencyServiceType[]
  agencyServices: AgencyService[]
  dark?: boolean
}) {
  if (!catalogPricePerDay || !requestedServices?.length) return null

  const baseTotal = catalogPricePerDay * durationDays

  const services = requestedServices.map(type => {
    const matches = agencyServices.filter(s => s.type === type && s.available)
    if (!matches.length || matches.some(s => s.priceType === 'inclus')) {
      return { type, label: AGENCY_SERVICE_LABELS[type], amount: 0, isIncluded: true }
    }
    const fixe = matches.find(s => s.priceType === 'fixe' && s.price != null)
    if (fixe) return { type, label: AGENCY_SERVICE_LABELS[type], amount: fixe.price!, isIncluded: false }
    return { type, label: AGENCY_SERVICE_LABELS[type], amount: 0, isIncluded: false }
  })

  const supplementTotal = services.reduce((acc, s) => acc + s.amount, 0)
  const grandTotal = baseTotal + supplementTotal

  const mutedCls   = dark ? 'text-slate-400' : 'text-slate-500'
  const valueCls   = dark ? 'text-white' : 'text-slate-800'
  const borderCls  = dark ? 'border-slate-700' : 'border-slate-200'
  const totalLblCls = dark ? 'text-slate-300' : 'text-slate-700'

  return (
    <div className={`text-xs flex flex-col gap-1 ${dark ? 'mt-3 pt-3 border-t border-slate-700' : 'mt-2 pt-2 border-t border-slate-100'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
        Revenu estimé
      </p>
      <div className={`flex justify-between ${mutedCls}`}>
        <span>Location · {catalogPricePerDay} €/j × {durationDays} j</span>
        <span className={`tabular-nums font-semibold ${valueCls}`}>{baseTotal} €</span>
      </div>
      {services.map(s => (
        <div key={s.type} className={`flex justify-between ${mutedCls}`}>
          <span>{s.label}</span>
          <span className={`tabular-nums font-semibold ${s.isIncluded ? (dark ? 'text-green-400' : 'text-green-600') : (dark ? 'text-amber-400' : 'text-amber-600')}`}>
            {s.isIncluded ? 'Inclus' : `+ ${s.amount} €`}
          </span>
        </div>
      ))}
      <div className={`flex justify-between border-t ${borderCls} mt-1 pt-1.5 font-black text-sm`}>
        <span className={totalLblCls}>Total HT</span>
        <span className={`tabular-nums ${dark ? 'text-white' : 'text-brand-600'}`}>{grandTotal} €</span>
      </div>
      {(() => {
        const { commission, net } = calculatePricing(catalogPricePerDay!, durationDays, supplementTotal)
        return (
          <>
            <div className={`flex justify-between ${mutedCls}`}>
              <span>Commission DRIVES ON (15 %)</span>
              <span className={`tabular-nums font-semibold ${dark ? 'text-red-400' : 'text-red-500'}`}>− {commission} €</span>
            </div>
            <div className={`flex justify-between border-t ${borderCls} mt-1 pt-1.5 font-black text-sm`}>
              <span className={dark ? 'text-green-400' : 'text-green-700'}>Gain net estimé</span>
              <span className={`tabular-nums ${dark ? 'text-green-300' : 'text-green-700'}`}>{net} € HT</span>
            </div>
          </>
        )
      })()}
    </div>
  )
}

// ── Mode avec tarif cible de l'assisteur ──────────────────────────────────────

function NegotiationResponseForm({ request, onSubmit, disabled, catalogPricePerDay, agencyServices }: Props & { catalogPricePerDay?: number; agencyServices: AgencyService[] }) {
  const target = request.targetPricePerDay!

  type Mode = 'accept' | 'counter' | 'refuse' | null
  const [mode, setMode]           = useState<Mode>(null)
  const [counterPrice, setCPrice] = useState(String(catalogPricePerDay ?? ''))
  const [vehicleModel, setVModel] = useState('')
  const [message, setMessage]     = useState('')
  const [submitting, setSub]      = useState(false)

  async function submit(action: LoueurAction) {
    setSub(true)
    try { await onSubmit(action) } finally { setSub(false) }
  }

  const totalTarget  = target * request.durationDays
  const counterNum   = Number(counterPrice)
  const counterValid = !isNaN(counterNum) && counterNum > 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">

      {/* Proposition de l'assisteur — header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 pt-5 pb-6">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Proposition de l'assisteur
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white tabular-nums">{target}</span>
          <span className="text-lg font-semibold text-slate-400">€/j</span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          = <span className="text-white font-semibold">{totalTarget} €</span> pour {request.durationDays} jour{request.durationDays > 1 ? 's' : ''}
        </p>
        {catalogPricePerDay !== undefined && catalogPricePerDay !== target && (
          <p className="text-xs text-slate-500 mt-2">
            Votre tarif catalogue : <span className="text-slate-400 font-semibold">{catalogPricePerDay} €/j</span>
          </p>
        )}
        <EarningsBreakdown
          catalogPricePerDay={target}
          durationDays={request.durationDays}
          requestedServices={request.requestedServices}
          agencyServices={agencyServices}
          dark
        />
      </div>

      {/* Actions */}
      <div className="p-4 flex flex-col gap-3">

        {/* Choisir le mode si pas encore choisi */}
        {mode === null && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setMode('accept')}
              disabled={disabled}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Accepter {target} €/j
              </div>
              <span className="text-green-300 text-xs font-normal">{totalTarget} €</span>
            </button>

            <button
              onClick={() => setMode('counter')}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-brand-400 text-slate-700 hover:text-brand-700 text-sm font-semibold transition-all disabled:opacity-50"
            >
              <Euro className="w-4 h-4" />
              Proposer un tarif différent
              <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-400" />
            </button>

            <button
              onClick={() => setMode('refuse')}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 text-sm font-medium transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Refuser cette demande
            </button>
          </div>
        )}

        {/* Mode : Accepter au tarif cible */}
        {mode === 'accept' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-semibold">
                Acceptation au tarif proposé — {target} €/j
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Modèle du véhicule (optionnel)
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={e => setVModel(e.target.value)}
                placeholder="ex. Renault Clio 2024"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Message (optionnel)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                placeholder="Ex. : le véhicule sera livré avant 9h…"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => submit({ type: 'accepter', pricePerDay: target, vehicleModel: vehicleModel.trim() || undefined, message: message.trim() || undefined })}
                disabled={submitting || disabled}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirmer — {target} €/j
              </button>
              <button
                onClick={() => setMode(null)}
                disabled={submitting}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Mode : Contre-offre */}
        {mode === 'counter' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-3 bg-brand-50 rounded-xl border border-brand-200">
              <Tag className="w-4 h-4 text-brand-500 shrink-0" />
              <p className="text-sm text-brand-700 font-semibold">
                Votre tarif sera soumis à l'assisteur pour validation
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Votre tarif journalier
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={counterPrice}
                  onChange={e => setCPrice(e.target.value)}
                  placeholder="ex. 75"
                  className="w-full border border-brand-300 rounded-xl px-4 py-2.5 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">€/j</span>
              </div>
              {counterValid && (
                <p className="text-xs text-slate-500 mt-0.5">
                  = <strong>{counterNum * request.durationDays} €</strong> pour {request.durationDays} jours
                  {counterNum > target && (
                    <span className="ml-2 text-amber-600">(+{counterNum - target} €/j vs proposition)</span>
                  )}
                  {counterNum < target && (
                    <span className="ml-2 text-green-600">(-{target - counterNum} €/j vs proposition)</span>
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Modèle du véhicule (optionnel)
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={e => setVModel(e.target.value)}
                placeholder="ex. Peugeot 208 2023"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Message à l'assisteur (optionnel)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                placeholder="Ex. : tarif ajusté selon disponibilité du parc…"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => submit({ type: 'contre_proposition', pricePerDay: counterNum, vehicleModel: vehicleModel.trim() || undefined, message: message.trim() || undefined })}
                disabled={submitting || disabled || !counterValid}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                Soumettre {counterValid ? `${counterPrice} €/j` : ''}
              </button>
              <button
                onClick={() => setMode(null)}
                disabled={submitting}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Mode : Refuser */}
        {mode === 'refuse' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-semibold">Vous allez refuser cette demande</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Motif du refus (recommandé)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="Ex. : aucun véhicule disponible pour cette période…"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => submit({ type: 'refuser', message: message.trim() || undefined })}
                disabled={submitting || disabled}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Confirmer le refus
              </button>
              <button
                onClick={() => setMode(null)}
                disabled={submitting}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Transfert */}
        {mode === null && (
          <div className="pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">Autre option</p>
            <details className="group">
              <summary className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer list-none font-medium">
                <ArrowRightLeft className="w-4 h-4" />
                Transférer à une autre agence
                <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3">
                <TransferRequestForm requestId={request.id} onSubmit={onSubmit} disabled={disabled} />
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mode standard (sans tarif cible) ─────────────────────────────────────────

function StandardResponseForm({ request, onSubmit, disabled, catalogPricePerDay, applicablePackage, offer, agencyServices }: Props & {
  catalogPricePerDay?: number
  applicablePackage: { label: string; price: number; days: number } | null
  offer: VehicleCategoryOffer | null
  agencyServices: AgencyService[]
}) {
  type Tab = 'accepter' | 'transferer' | 'refuser'
  const [activeTab, setActiveTab]   = useState<Tab>('accepter')
  const [vehicleModel, setVModel]   = useState('')
  const [message, setMessage]       = useState('')
  const [submitting, setSub]        = useState(false)

  const TABS: { type: Tab; label: string; icon: React.ReactNode; activeCls: string }[] = [
    { type: 'accepter',   label: 'Accepter',   icon: <Check className="w-4 h-4" />,          activeCls: 'text-green-700 border-green-500 bg-green-50'  },
    { type: 'transferer', label: 'Transférer', icon: <ArrowRightLeft className="w-4 h-4" />, activeCls: 'text-orange-700 border-orange-500 bg-orange-50' },
    { type: 'refuser',    label: 'Refuser',    icon: <X className="w-4 h-4" />,              activeCls: 'text-red-700 border-red-500 bg-red-50'          },
  ]

  async function handleSubmit() {
    const action: LoueurAction = {
      type:         activeTab === 'transferer' ? 'transferer' : activeTab,
      pricePerDay:  activeTab === 'accepter' ? catalogPricePerDay : undefined,
      vehicleModel: vehicleModel.trim() || undefined,
      message:      message.trim() || undefined,
    }
    setSub(true)
    try { await onSubmit(action) } finally { setSub(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-slate-700">Votre réponse</h2>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActiveTab(tab.type)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              activeTab === tab.type ? tab.activeCls : 'text-slate-500 border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'transferer' && (
        <TransferRequestForm requestId={request.id} onSubmit={onSubmit} disabled={disabled} />
      )}

      {activeTab !== 'transferer' && (
        <div className="flex flex-col gap-4">
          {activeTab === 'accepter' && (
            <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${
              applicablePackage ? 'bg-brand-50 border-brand-200'
              : offer           ? 'bg-slate-50 border-slate-200'
              :                   'bg-amber-50 border-amber-200'
            }`}>
              {applicablePackage
                ? <Tag  className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                : <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              }
              <div className="flex flex-col gap-0.5">
                {applicablePackage ? (
                  <>
                    <p className="text-xs font-semibold text-brand-700">Forfait : {applicablePackage.label} — {applicablePackage.price} €</p>
                    <p className="text-xs text-brand-600">{catalogPricePerDay} €/j × {request.durationDays}j</p>
                  </>
                ) : offer ? (
                  <>
                    <p className="text-xs font-semibold text-slate-700">Tarif journalier : {offer.dailyRate} €/j</p>
                    <p className="text-xs text-slate-500">= {(offer.dailyRate * request.durationDays).toFixed(2)} € pour {request.durationDays}j</p>
                  </>
                ) : (
                  <p className="text-xs text-amber-700">Aucun tarif défini pour cette catégorie.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'accepter' && (
            <EarningsBreakdown
              catalogPricePerDay={catalogPricePerDay}
              durationDays={request.durationDays}
              requestedServices={request.requestedServices}
              agencyServices={agencyServices}
            />
          )}

          {activeTab === 'accepter' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Modèle du véhicule (optionnel)</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={e => setVModel(e.target.value)}
                placeholder="ex. Renault Clio 2024"
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {activeTab === 'refuser' ? 'Motif du refus' : 'Message (optionnel)'}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 resize-none"
              placeholder={activeTab === 'refuser' ? 'Ex. : aucun véhicule disponible…' : 'Ex. : livraison avant 9h…'}
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || disabled}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
              activeTab === 'accepter' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : TABS.find(t => t.type === activeTab)?.icon}
            {activeTab === 'accepter' ? 'Confirmer la demande' : 'Refuser la demande'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export function RentalResponseForm({ request, onSubmit, disabled }: Props) {
  const [offer, setOffer]                 = useState<VehicleCategoryOffer | null>(null)
  const [agencyServices, setAgencyServices] = useState<AgencyService[]>([])

  useEffect(() => {
    getCategoryOffersByAgency(request.agencyId).then(offers => {
      setOffer(offers.find(o => o.category === request.vehicleCategory) ?? null)
    })
    getServicesByAgency(request.agencyId).then(setAgencyServices)
  }, [request.agencyId, request.vehicleCategory])

  const applicablePackage = offer?.packages.find(p => p.days === request.durationDays) ?? null
  const catalogPricePerDay = applicablePackage
    ? Math.round((applicablePackage.price / request.durationDays) * 100) / 100
    : offer?.dailyRate ?? undefined

  if (request.targetPricePerDay) {
    return (
      <NegotiationResponseForm
        request={request}
        onSubmit={onSubmit}
        disabled={disabled}
        catalogPricePerDay={catalogPricePerDay}
        agencyServices={agencyServices}
      />
    )
  }

  return (
    <StandardResponseForm
      request={request}
      onSubmit={onSubmit}
      disabled={disabled}
      catalogPricePerDay={catalogPricePerDay}
      applicablePackage={applicablePackage}
      offer={offer}
      agencyServices={agencyServices}
    />
  )
}
