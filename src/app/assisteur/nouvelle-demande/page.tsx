'use client'

import { useState } from 'react'
import { AssistanceRequestForm }  from '@/components/assisteur/AssistanceRequestForm'
import { MatchedCompanyList }     from '@/components/assisteur/MatchedCompanyList'
import { RequestRecap }           from '@/components/assisteur/RequestRecap'
import { RequestConfirmation }    from '@/components/assisteur/RequestConfirmation'
import { getMatchingResults }     from '@/services/matchingService'
import { getRentalCompanyById }   from '@/services/rentalCompanyService'
import { sendRequest }            from '@/services/requestService'
import { addDocument }            from '@/services/documentService'
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
  const [step, setStep]     = useState<Step>('form')
  const [loading, setLoading] = useState(false)

  const [requestInput, setRequestInput]       = useState<RequestFormInput | null>(null)
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([])
  const [pendingConfirm, setPendingConfirm]   = useState<PendingConfirm | null>(null)
  const [selectedCompanies, setSelectedCompanies] = useState<RentalCompany[]>([])

  const [confirmedRequest, setConfirmedRequest]   = useState<AssistanceRequest | null>(null)
  const [confirmedCompanies, setConfirmedCompanies] = useState<RentalCompany[]>([])
  const [documentUploaded, setDocumentUploaded]   = useState(false)

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
      if (coverageFile) {
        await addDocument({
          requestId: request.id,
          type:      'prise_en_charge',
          owner:     'assisteur',
          fileName:  coverageFile.name,
          sizeKb:    Math.round(coverageFile.size / 1024),
        })
        setDocumentUploaded(true)
      } else if (coverageUrl) {
        await addDocument({
          requestId: request.id,
          type:      'prise_en_charge',
          owner:     'assisteur',
          fileName:  'Lien document',
          url:       coverageUrl,
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
            <AssistanceRequestForm onSubmit={handleFormSubmit} loading={loading} />
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
