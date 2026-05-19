'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, XCircle, FileText, History, ArrowRightLeft, Lock, Loader2,
  CalendarCheck, Clock, Ban, AlertTriangle, ShieldAlert,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { RentalRequestDetail } from '@/components/loueur/RentalRequestDetail'
import { RentalResponseForm }  from '@/components/loueur/RentalResponseForm'
import { SharedRequestDocuments } from '@/components/shared/SharedRequestDocuments'
import { RequestTimeline }     from '@/components/shared/RequestTimeline'
import { getReceivedRequestById, respondToRequest } from '@/services/loueurService'
import { respondToExtension } from '@/services/requestService'
import { loueurConfirmReturn } from '@/services/loueurService'
import { getDisplayStatus } from '@/lib/displayStatus'
import { getEffectiveDuration } from '@/types/request'
import type { ReceivedRequest, LoueurAction } from '@/types/loueur'

const RESPONDED_STATUSES = [
  'acceptee', 'confirmee', 'refusee', 'transfert_propose', 'transfert_valide',
  'transferee', 'honoree', 'cloturee',
]

function StatusBannerRow({
  icon, title, description, accent, bg, border,
}: {
  icon: React.ReactNode; title: string; description: string
  accent: string; bg: string; border: string
}) {
  return (
    <div className={`flex overflow-hidden rounded-2xl border ${border} ${bg}`}>
      <div className={`w-1 shrink-0 ${accent}`} />
      <div className="flex items-start gap-3 p-4">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs mt-0.5 opacity-80">{description}</p>
        </div>
      </div>
    </div>
  )
}

function LockedByOtherBanner() {
  return (
    <StatusBannerRow
      icon={<Lock className="w-5 h-5 text-slate-500" />}
      title="Demande déjà prise en charge"
      description="Désolé, cette demande a déjà été validée par un autre loueur. Restez réactif pour les prochaines — la rapidité fait toute la différence !"
      accent="bg-slate-400"
      bg="bg-slate-50 text-slate-700"
      border="border-slate-200"
    />
  )
}

function ResponsedBanner({ status }: { status: string }) {
  if (status === 'acceptee') return (
    <StatusBannerRow
      icon={<CheckCircle2 className="w-5 h-5 text-teal-600" />}
      title="Prix proposé — en attente de validation"
      description="L'assisteur examine votre proposition."
      accent="bg-teal-500"
      bg="bg-teal-50 text-teal-700"
      border="border-teal-200"
    />
  )
  if (status === 'confirmee') return (
    <StatusBannerRow
      icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
      title="Demande confirmée"
      description="Vous vous êtes engagé à honorer cette location."
      accent="bg-green-500"
      bg="bg-green-50 text-green-700"
      border="border-green-200"
    />
  )
  if (status === 'transfert_propose') return (
    <StatusBannerRow
      icon={<ArrowRightLeft className="w-5 h-5 text-orange-600" />}
      title="Transfert proposé"
      description="En attente de validation par l'assisteur."
      accent="bg-orange-500"
      bg="bg-orange-50 text-orange-700"
      border="border-orange-200"
    />
  )
  if (status === 'transfert_valide' || status === 'transferee') return (
    <StatusBannerRow
      icon={<ArrowRightLeft className="w-5 h-5 text-blue-600" />}
      title="Demande transférée"
      description="Le transfert a été validé par l'assisteur."
      accent="bg-blue-500"
      bg="bg-blue-50 text-blue-700"
      border="border-blue-200"
    />
  )
  if (status === 'refusee') return (
    <StatusBannerRow
      icon={<XCircle className="w-5 h-5 text-red-600" />}
      title="Demande refusée"
      description="Vous avez refusé cette demande."
      accent="bg-red-500"
      bg="bg-red-50 text-red-700"
      border="border-red-200"
    />
  )
  if (status === 'honoree') return (
    <StatusBannerRow
      icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
      title="Retour confirmé — en attente de paiement"
      description="Le véhicule a bien été rendu. L'assisteur va valider le paiement."
      accent="bg-blue-500"
      bg="bg-blue-50 text-blue-700"
      border="border-blue-200"
    />
  )
  if (status === 'cloturee') return (
    <StatusBannerRow
      icon={<Ban className="w-5 h-5 text-slate-500" />}
      title="Dossier clôturé"
      description="Le paiement a été validé par l'assisteur. Ce dossier est archivé."
      accent="bg-slate-400"
      bg="bg-slate-50 text-slate-600"
      border="border-slate-200"
    />
  )
  return null
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}
function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function LoueurRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest]           = useState<ReceivedRequest | null>(null)
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
const [extLoading, setExtLoading]     = useState(false)
  const [returnDate, setReturnDate]       = useState(todayStr)
  const [returnTime, setReturnTime]       = useState(nowTimeStr)
  const [returnLoading, setReturnLoading] = useState(false)
  const [damageDesc, setDamageDesc]       = useState('')
  const [damageLoading, setDamageLoading] = useState(false)
  const [damageError, setDamageError]     = useState<string | null>(null)

  useEffect(() => {
    getReceivedRequestById(id).then(found => {
      if (found) setRequest(found)
      else       setNotFound(true)
      setLoading(false)
    })
  }, [id])

  const handleResponse = useCallback(async (action: LoueurAction) => {
    if (!request) return
    const updated = await respondToRequest(request.id, action)
    if (updated) setRequest(r => r ? { ...r, ...updated } : r)
  }, [request])

  const handleExtensionResponse = useCallback(async (extensionId: string, response: 'acceptee' | 'refusee') => {
    if (!request) return
    setExtLoading(true)
    const updated = await respondToExtension(request.id, extensionId, response)
    if (updated) setRequest(r => r ? { ...r, ...updated } : r)
    setExtLoading(false)
  }, [request])

  const handleConfirmReturn = useCallback(async () => {
    if (!request) return
    setReturnLoading(true)
    const returnedAt = new Date(`${returnDate}T${returnTime}`)
    const updated = await loueurConfirmReturn(request.id, returnedAt)
    if (updated) setRequest(r => r ? { ...r, ...updated } : r)
    setReturnLoading(false)
  }, [request, returnDate, returnTime])

  const handleDeclareDamage = useCallback(async () => {
    if (!request) return
    setDamageLoading(true)
    setDamageError(null)
    try {
      const res = await fetch(`/api/loueur/requests/${request.id}/declare-damage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ description: damageDesc }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erreur lors de la déclaration')
      }
      setRequest(r => r ? { ...r, hasDamageClaim: true } : r)
    } catch (err) {
      setDamageError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDamageLoading(false)
    }
  }, [request, damageDesc])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
        <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
        <div className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (notFound || !request) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-slate-500 text-sm">Demande introuvable ou ne vous appartient pas.</p>
        <Link href="/loueur/dashboard" className="text-brand-500 text-sm underline underline-offset-2">
          ← Retour au tableau de bord
        </Link>
      </div>
    )
  }

  const isLockedByOther = !!(
    request.confirmedAgencyId &&
    request.confirmedAgencyId !== request.agencyId
  )
  const canRespond = !RESPONDED_STATUSES.includes(request.status) && !isLockedByOther

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/loueur/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Tableau de bord
      </Link>

      {isLockedByOther && <LockedByOtherBanner />}
      {!isLockedByOther && !canRespond && <ResponsedBanner status={request.status} />}

      {/* Prolongation en attente */}
      {(() => {
        const pending = request.extensions?.find(e => e.status === 'en_attente')
        if (!pending) return null

        const pricePerDay   = request.loueurResponse?.pricePerDay
        const effectiveDays = getEffectiveDuration(request)
        const newTotalDays  = effectiveDays + pending.requestedDays
        const pastExts      = (request.extensions ?? []).filter(e => e.id !== pending.id)

        // Use stored pricing fields when available (set by assisteur at request time),
        // fall back to simple daily-rate calculation for legacy data
        const extCost   = pending.extensionCost  ?? (pricePerDay ? pending.requestedDays * pricePerDay : undefined)
        const totalCost = pending.newTotalPrice   ?? (pricePerDay ? newTotalDays * pricePerDay         : undefined)
        const baseTotal = pricePerDay ? effectiveDays * pricePerDay : undefined

        return (
          <div className="flex flex-col gap-4 p-5 bg-orange-50 border-2 border-orange-200 rounded-2xl">

            {/* Header */}
            <div className="flex items-center gap-2 text-orange-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Demande de prolongation
            </div>

            {/* Motif */}
            {pending.note && (
              <p className="text-xs text-slate-500 italic">Motif : "{pending.note}"</p>
            )}

            {/* Décomposition financière */}
            <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>
                  Location en cours ({effectiveDays}j
                  {pricePerDay ? ` × ${pricePerDay} €/j` : ''})
                </span>
                <span className="font-semibold text-slate-800">
                  {baseTotal !== undefined ? `${baseTotal} €` : `${effectiveDays} jours`}
                </span>
              </div>
              <div className="flex justify-between text-orange-700">
                <span>
                  {pending.isForfait && pending.forfaitLabel
                    ? `+ Forfait ${pending.forfaitLabel} (${pending.requestedDays}j supplémentaires)`
                    : `+ Prolongation (${pending.requestedDays}j${pending.appliedPricePerDay ? ` × ${pending.appliedPricePerDay} €/j` : pricePerDay ? ` × ${pricePerDay} €/j` : ''})`
                  }
                </span>
                <span className="font-semibold">
                  {extCost !== undefined ? `+ ${extCost} €` : `+${pending.requestedDays}j`}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-orange-200 pt-2">
                <span className="text-slate-800">
                  Total si acceptée ({newTotalDays} jour{newTotalDays > 1 ? 's' : ''}
                  {pending.isForfait ? ' — forfait' : ''})
                </span>
                <span className="text-green-700">
                  {totalCost !== undefined ? `${totalCost} €` : `${newTotalDays}j`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleExtensionResponse(pending.id, 'acceptee')}
                disabled={extLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
              >
                {extLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accepter
                {extCost !== undefined && (
                  <span className="ml-1 opacity-90">— +{extCost} €</span>
                )}
              </button>
              <button
                onClick={() => handleExtensionResponse(pending.id, 'refusee')}
                disabled={extLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm font-semibold disabled:opacity-60 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Refuser
              </button>
            </div>

            {/* Prolongations précédentes */}
            {pastExts.length > 0 && (
              <div className="border-t border-orange-200 pt-3 flex flex-col gap-1.5">
                <p className="text-xs text-slate-400 font-medium">Prolongations précédentes</p>
                {pastExts.map(ext => {
                  const pastCost = ext.extensionCost ?? (pricePerDay && ext.status === 'acceptee' ? ext.requestedDays * pricePerDay : undefined)
                  return (
                    <div key={ext.id} className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className={`font-semibold px-1.5 py-0.5 rounded-full ${
                        ext.status === 'acceptee' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {ext.status === 'acceptee' ? 'Acceptée' : 'Refusée'}
                      </span>
                      <span>+{ext.requestedDays}j</span>
                      {pastCost !== undefined && (
                        <span className="text-green-600 font-medium">
                          +{pastCost} €
                          {ext.isForfait && ext.forfaitLabel && (
                            <span className="ml-1 font-normal text-purple-600">(forfait {ext.forfaitLabel})</span>
                          )}
                        </span>
                      )}
                      {ext.note && <span className="italic truncate">"{ext.note}"</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* Confirmation de retour du véhicule */}
      {request.status === 'confirmee' &&
       getDisplayStatus(request.status, request.dateNeeded) === 'en_cours' && (
        <VehicleReturnSection
          returnDate={returnDate}
          returnTime={returnTime}
          onDateChange={setReturnDate}
          onTimeChange={setReturnTime}
          onConfirm={handleConfirmReturn}
          loading={returnLoading}
        />
      )}

      {/* Déclaration de sinistre */}
      {request.status === 'honoree' && (
        <DamageClaimSection
          hasDamageClaim={!!request.hasDamageClaim}
          description={damageDesc}
          onDescriptionChange={setDamageDesc}
          onDeclare={handleDeclareDamage}
          loading={damageLoading}
          error={damageError}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="flex-1 min-w-0">
          <RentalRequestDetail request={request} />
        </div>

        {canRespond && (
          <div className="w-full lg:w-96 shrink-0">
            <RentalResponseForm
              request={request}
              onSubmit={handleResponse}
            />
          </div>
        )}
      </div>

      {/* Documents partagés */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-800">Documents du dossier</h2>
        </div>
        <SharedRequestDocuments
          requestId={request.id}
          viewerRole="loueur"
          status={request.status}
        />
      </div>

      {/* Timeline */}
      {request.timeline.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-800">Historique</h2>
          </div>
          <RequestTimeline events={request.timeline} />
        </div>
      )}
    </div>
  )
}

// ── Déclaration de sinistre ───────────────────────────────────────────────────

function DamageClaimSection({
  hasDamageClaim, description, onDescriptionChange, onDeclare, loading, error,
}: {
  hasDamageClaim:      boolean
  description:         string
  onDescriptionChange: (v: string) => void
  onDeclare:           () => void
  loading:             boolean
  error:               string | null
}) {
  if (hasDamageClaim) {
    return (
      <div className="flex overflow-hidden rounded-2xl border-2 border-red-300 bg-red-50">
        <div className="w-1 shrink-0 bg-red-500" />
        <div className="flex items-start gap-3 p-4">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Sinistre déclaré</p>
            <p className="text-xs text-red-700 mt-0.5">
              Déposez les documents requis dans la section ci-dessous : état des lieux départ, état des lieux retour, et photos des dégâts.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
      <div className="w-1 shrink-0 bg-amber-500" />
      <div className="flex-1 p-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-semibold">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          Signaler un dégât sur le véhicule
        </div>
        <p className="text-sm text-amber-800/80">
          Si le véhicule a subi des dégâts pendant la location, déclarez le sinistre ci-dessous.
          Vous devrez ensuite déposer : <strong>état des lieux départ</strong>, <strong>état des lieux retour</strong> et <strong>photos des dégâts</strong>.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
            Description des dégâts (optionnel)
          </label>
          <textarea
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Ex : rayure profonde aile avant droite, pare-chocs enfoncé…"
            className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={onDeclare}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Déclaration en cours…</>
            : <><ShieldAlert className="w-4 h-4" />Déclarer le sinistre</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Vehicle return confirmation form ─────────────────────────────────────────

function VehicleReturnSection({
  returnDate, returnTime, onDateChange, onTimeChange, onConfirm, loading,
}: {
  returnDate: string
  returnTime: string
  onDateChange: (v: string) => void
  onTimeChange: (v: string) => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <div className="flex overflow-hidden rounded-2xl border-2 border-blue-300 bg-blue-50">
      <div className="w-1 shrink-0 bg-blue-500" />
      <div className="flex-1 p-5 space-y-4">
        <div className="flex items-center gap-2 text-blue-700 font-semibold">
          <CalendarCheck className="w-5 h-5 shrink-0" />
          Confirmer le retour du véhicule
        </div>
        <p className="text-sm text-blue-700/80">
          La location est en cours. Saisissez la date et l'heure de restitution effective du véhicule puis confirmez.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Date de retour</label>
            <div className="relative flex items-center">
              <CalendarCheck className="absolute left-3 w-4 h-4 text-blue-400 pointer-events-none" aria-hidden="true" />
              <input
                type="date"
                value={returnDate}
                onChange={e => onDateChange(e.target.value)}
                className="pl-9 pr-3 py-2 border border-blue-300 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Heure</label>
            <div className="relative flex items-center">
              <Clock className="absolute left-3 w-4 h-4 text-blue-400 pointer-events-none" aria-hidden="true" />
              <input
                type="time"
                value={returnTime}
                onChange={e => onTimeChange(e.target.value)}
                className="pl-9 pr-3 py-2 border border-blue-300 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>
          </div>
          <button
            onClick={onConfirm}
            disabled={loading || !returnDate || !returnTime}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmer le retour
          </button>
        </div>
      </div>
    </div>
  )
}
