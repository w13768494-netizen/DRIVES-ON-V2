'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RotateCcw, X } from 'lucide-react'
import { getSession }             from '@/services/currentSessionService'
import { AssistanceRequestForm }  from '@/components/assisteur/AssistanceRequestForm'
import { MatchedCompanyList }     from '@/components/assisteur/MatchedCompanyList'
import { RequestRecap }           from '@/components/assisteur/RequestRecap'
import { RequestConfirmation }    from '@/components/assisteur/RequestConfirmation'
import { getMatchingResults }     from '@/services/matchingService'
import { getRentalCompanyById }   from '@/services/rentalCompanyService'
import { sendRequest }            from '@/services/requestService'
import { addDocument }            from '@/services/documentService'
import { saveDraft, loadDraft, clearDraft, isDraftExpired } from '@/lib/formDraft'
import type { StoredDraft }       from '@/lib/formDraft'
import type { FormValues }        from '@/components/assisteur/AssistanceRequestForm'
import type { RequestFormInput, AssistanceRequest } from '@/types/request'
import type { RentalCompany }     from '@/types/rentalCompany'
import type { MatchingResult }    from '@/types/matching'
import type { AgencyServiceType } from '@/types/agencyService'
import type { AgencyService } from '@/types/agencyService'

type Step = 'form' | 'select' | 'recap' | 'confirmed'

const STEPS = [
  { id: 'form',      label: 'Détails'   },
  { id: 'select',    label: 'Loueurs'   },
  { id: 'recap',     label: 'Récap'     },
  { id: 'confirmed', label: 'Envoyée'   },
] as const

interface PendingConfirm {
  companyIds:      string[]
  serviceTypes:    AgencyServiceType[]
  agencyServices:  AgencyService[]
  targetPrice?:    number
}

export default function NouvelleDemandePage() {
  const accountType = getSession()?.accountType ?? 'assistance'
  const [step, setStep]     = useState<Step>('form')
  const [loading, setLoading] = useState(false)

  const [requestInput, setRequestInput]       = useState<RequestFormInput | null>(null)
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([])
  const [pendingConfirm, setPendingConfirm]   = useState<PendingConfirm | null>(null)
  const [selectedCompanies, setSelectedCompanies] = useState<RentalCompany[]>([])

  const [confirmedRequest, setConfirmedRequest]   = useState<AssistanceRequest | null>(null)
  const [confirmedCompanies, setConfirmedCompanies] = useState<RentalCompany[]>([])
  const [documentUploaded, setDocumentUploaded]   = useState(false)

  const [draft, setDraft]               = useState<StoredDraft | null>(null)
  const [draftDismissed, setDraftDismissed] = useState(false)
  const [appliedDraft, setAppliedDraft] = useState<StoredDraft | null>(null)

  useEffect(() => {
    const stored = loadDraft()
    if (stored) setDraft(stored)
  }, [])

  function handleResumeDraft() {
    setAppliedDraft(draft)
    setDraftDismissed(true)
  }

  function handleDismissDraft() {
    clearDraft()
    setDraft(null)
    setDraftDismissed(true)
  }

  // Step 1 → 2
  async function handleFormSubmit(input: RequestFormInput) {
    setLoading(true)
    try {
      const results = await getMatchingResults({
        latitude:        input.location.latitude,
        longitude:       input.location.longitude,
        vehicleCategory: input.vehicleCategory,
        radiusKm:        50,
        durationDays:    input.durationDays,
      })
      setRequestInput(input)
      setMatchingResults(results)
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 → 3 : récap (pas encore envoyé)
  async function handlePrepareConfirm(companyIds: string[], serviceTypes: AgencyServiceType[], agencyServices: AgencyService[], targetPrice?: number) {
    if (!requestInput || companyIds.length === 0) return
    setLoading(true)
    try {
      const companies = await Promise.all(companyIds.map(id => getRentalCompanyById(id)))
      setPendingConfirm({ companyIds, serviceTypes, agencyServices, targetPrice })
      setSelectedCompanies(companies.filter(Boolean) as RentalCompany[])
      setStep('recap')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 → 4 : envoi réel
  async function handleSend(coverageFile?: File, coverageUrl?: string) {
    if (!requestInput || !pendingConfirm) return
    setLoading(true)
    try {
      const { companyIds, serviceTypes, targetPrice } = pendingConfirm
      const input = {
        ...requestInput,
        ...(serviceTypes.length > 0 ? { requestedServices: serviceTypes } : {}),
        ...(targetPrice             ? { targetPricePerDay: targetPrice }    : {}),
      }
      const request = await sendRequest(input, companyIds)
      clearDraft()
      setDraft(null)
      if (coverageFile) {
        await addDocument({
          file:      coverageFile,
          requestId: request.id,
          type:      'prise_en_charge',
          owner:     'assisteur',
        })
        setDocumentUploaded(true)
      } else if (coverageUrl) {
        await addDocument({
          url:       coverageUrl,
          requestId: request.id,
          type:      'prise_en_charge',
          owner:     'assisteur',
        })
        setDocumentUploaded(true)
      }
      setConfirmedRequest(request)
      setConfirmedCompanies(selectedCompanies)
      setStep('confirmed')
    } finally {
      setLoading(false)
    }
  }

  function handleNewRequest() {
    clearDraft()
    setDraft(null)
    setDraftDismissed(false)
    setAppliedDraft(null)
    setStep('form')
    setRequestInput(null)
    setMatchingResults([])
    setPendingConfirm(null)
    setSelectedCompanies([])
    setConfirmedRequest(null)
    setConfirmedCompanies([])
    setDocumentUploaded(false)
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === step)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <nav className="flex items-center mb-8" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <StepIndicator
            key={s.id}
            index={i + 1}
            label={s.label}
            status={i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : 'pending'}
            isLast={i === STEPS.length - 1}
          />
        ))}
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        {step === 'form' && (
          <>
            <SectionTitle
              title="Nouvelle demande"
              subtitle="Renseignez les détails de la situation pour trouver les meilleurs loueurs disponibles."
            />
            {draft && !draftDismissed && (
              <DraftBanner
                draft={draft}
                onResume={handleResumeDraft}
                onDismiss={handleDismissDraft}
              />
            )}
            <AssistanceRequestForm
              accountType={accountType}
              onSubmit={handleFormSubmit}
              loading={loading}
              initialValues={appliedDraft?.values}
              onChange={saveDraft}
            />
          </>
        )}

        {step === 'select' && requestInput && (
          <>
            <SectionTitle
              title="Loueurs recommandés"
              subtitle={`Classés par compatibilité — ${requestInput.location.address}`}
            />
            <MatchedCompanyList
              results={matchingResults}
              vehicleCategory={requestInput.vehicleCategory}
              durationDays={requestInput.durationDays}
              onBack={() => setStep('form')}
              onConfirm={handlePrepareConfirm}
              loading={loading}
            />
          </>
        )}

        {step === 'recap' && requestInput && pendingConfirm && (
          <RequestRecap
            input={requestInput}
            companies={selectedCompanies}
            serviceTypes={pendingConfirm.serviceTypes}
            agencyServices={pendingConfirm.agencyServices}
            targetPrice={pendingConfirm.targetPrice}
            onBack={() => setStep('select')}
            onSend={handleSend}
            loading={loading}
          />
        )}

        {step === 'confirmed' && confirmedRequest && (
          <RequestConfirmation
            request={confirmedRequest}
            companies={confirmedCompanies}
            documentUploaded={documentUploaded}
            onNewRequest={handleNewRequest}
          />
        )}
      </div>
    </div>
  )
}

function DraftBanner({
  draft, onResume, onDismiss,
}: { draft: StoredDraft; onResume: () => void; onDismiss: () => void }) {
  const expired = isDraftExpired(draft)
  const savedAt = new Date(draft.savedAt)
  const label   = savedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`mb-5 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
      expired
        ? 'bg-amber-50 border-amber-200'
        : 'bg-brand-50 border-brand-200'
    }`}>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {expired
          ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          : <RotateCcw     className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        }
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-tight ${expired ? 'text-amber-700' : 'text-brand-700'}`}>
            Brouillon enregistré
          </p>
          <p className={`text-xs mt-0.5 ${expired ? 'text-amber-600' : 'text-brand-500'}`}>
            {expired
              ? `Sauvegardé le ${label} — la date de besoin est dépassée`
              : `Sauvegardé le ${label}`
            }
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!expired && (
          <button
            type="button"
            onClick={onResume}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Reprendre
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            expired
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Ignorer
        </button>
        <button type="button" onClick={onDismiss} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 pb-5 border-b border-slate-100">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function StepIndicator({
  index, label, status, isLast,
}: { index: number; label: string; status: 'done' | 'active' | 'pending'; isLast: boolean }) {
  const circleCls =
    status === 'done'    ? 'bg-brand-500 text-white border-brand-500' :
    status === 'active'  ? 'bg-white text-brand-600 border-brand-500' :
                           'bg-white text-slate-300 border-slate-200'
  const labelCls =
    status === 'active'  ? 'text-slate-800 font-semibold' :
    status === 'done'    ? 'text-slate-500' :
                           'text-slate-300'

  return (
    <div className="flex items-center flex-1 last:flex-none">
      <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border-2 ${circleCls}`}>
          {status === 'done' ? '✓' : index}
        </div>
        <span className={`text-[11px] sm:text-xs transition-colors duration-200 ${labelCls}`}>{label}</span>
      </div>
      {!isLast && (
        <div className={`flex-1 h-0.5 mx-3 mb-5 sm:mb-0 rounded-full transition-all duration-300 ${
          status === 'done' ? 'bg-brand-400' : 'bg-slate-200'
        }`} />
      )}
    </div>
  )
}
