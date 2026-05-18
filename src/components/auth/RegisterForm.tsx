'use client'

import { useState }      from 'react'
import { Loader2, ShieldCheck, Truck, CheckCircle2, Building2, Wrench, ChevronLeft } from 'lucide-react'
import { createClient }  from '@/lib/supabase/client'
import type { AccountType } from '@/types/session'
import type { AccessRequestRole } from '@/types/accessRequest'

// ── Types de compte ───────────────────────────────────────────────────────────

type AccountChoice =
  | { role: 'assisteur'; accountType: AccountType }
  | { role: 'loueur';    accountType: null }

const ACCOUNT_OPTIONS: {
  role:        AccessRequestRole
  accountType: AccountType | null
  label:       string
  desc:        string
  icon:        React.ReactNode
}[] = [
  {
    role:        'assisteur',
    accountType: 'assistance',
    label:       'Assistance',
    desc:        'Compagnie ou plateforme d\'assistance',
    icon:        <ShieldCheck className="w-5 h-5" />,
  },
  {
    role:        'assisteur',
    accountType: 'insurance_agent',
    label:       'Agent assurance',
    desc:        'Agence, courtier ou réseau',
    icon:        <Building2 className="w-5 h-5" />,
  },
  {
    role:        'assisteur',
    accountType: 'garage',
    label:       'Garage / Réparateur',
    desc:        'Carrosserie, mécanique, concession',
    icon:        <Wrench className="w-5 h-5" />,
  },
  {
    role:        'loueur',
    accountType: null,
    label:       'Loueur',
    desc:        'Société de location indépendante',
    icon:        <Truck className="w-5 h-5" />,
  },
]

// ── Composant principal ───────────────────────────────────────────────────────

export function AccessRequestForm() {
  const [step, setStep]             = useState<1 | 2>(1)
  const [choice, setChoice]         = useState<AccountChoice | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [done, setDone]             = useState(false)

  // Champs communs
  const [firstName, setFirstName]           = useState('')
  const [lastName, setLastName]             = useState('')
  const [contactFunction, setContactFunction] = useState('')
  const [companyName, setCompanyName]       = useState('')
  const [siret, setSiret]                   = useState('')
  const [address, setAddress]               = useState('')
  const [city, setCity]                     = useState('')
  const [postalCode, setPostalCode]         = useState('')
  const [email, setEmail]                   = useState('')
  const [phone, setPhone]                   = useState('')
  const [interventionZone, setInterventionZone] = useState('')
  const [monthlyEstimate, setMonthlyEstimate]   = useState('')
  const [message, setMessage]               = useState('')

  // Champs spécifiques assistance
  const [assistPlatform, setAssistPlatform]   = useState('')
  const [assistDossiers, setAssistDossiers]   = useState('')

  // Champs spécifiques insurance_agent
  const [agentNetwork, setAgentNetwork]     = useState('')
  const [agentOrias, setAgentOrias]         = useState('')
  const [agentClientele, setAgentClientele] = useState('')

  // Champs spécifiques garage
  const [garageType, setGarageType]         = useState('')
  const [garageCourtesy, setGarageCourtesy] = useState('')
  const [garageNeed, setGarageNeed]         = useState('')

  function handleChoiceSelect(opt: typeof ACCOUNT_OPTIONS[number]) {
    setChoice({ role: opt.role, accountType: opt.accountType } as AccountChoice)
    setStep(2)
  }

  function buildExtraFields(): Record<string, unknown> | null {
    if (!choice || choice.role === 'loueur') return null
    if (choice.accountType === 'assistance') {
      return { platform: assistPlatform, dossier_types: assistDossiers }
    }
    if (choice.accountType === 'insurance_agent') {
      return { network: agentNetwork, orias: agentOrias || null, clientele: agentClientele }
    }
    if (choice.accountType === 'garage') {
      return {
        establishment_type:  garageType,
        courtesy_vehicles:   garageCourtesy ? Number(garageCourtesy) : null,
        main_need:           garageNeed,
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!choice) return
    setError(null)
    setLoading(true)

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    const payload: Record<string, unknown> = {
      email:        email.trim(),
      full_name:    fullName,
      company_name: companyName.trim() || null,
      role:         choice.role,
      phone:        phone.trim() || null,
      message:      message.trim() || null,
    }

    if (choice.role === 'assisteur') {
      payload.account_type              = choice.accountType
      payload.contact_function          = contactFunction.trim() || null
      payload.siret                     = siret.trim() || null
      payload.address                   = address.trim() || null
      payload.city                      = city.trim() || null
      payload.postal_code               = postalCode.trim() || null
      payload.intervention_zone         = interventionZone.trim() || null
      payload.monthly_requests_estimate = monthlyEstimate ? Number(monthlyEstimate) : null
      payload.extra_fields              = buildExtraFields()
    }

    const supabase = createClient()
    const { error: err } = await supabase.from('access_requests').insert(payload)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Demande envoyée !</h3>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            L'équipe Drives On va examiner votre dossier et vous contacter à{' '}
            <strong>{email}</strong> pour finaliser votre accès.
          </p>
        </div>
        <a href="/login" className="inline-block text-brand-500 hover:text-brand-600 text-sm font-semibold">
          Retour à la connexion →
        </a>
      </div>
    )
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all placeholder:text-slate-400'

  // ── Étape 1 : choix du type de compte ──────────────────────────────────────

  if (step === 1) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Votre activité
          </span>
          <p className="text-xs text-slate-400 mt-1">
            Choisissez le type de compte qui correspond à votre organisation.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {ACCOUNT_OPTIONS.map(opt => (
            <button
              key={`${opt.role}-${opt.accountType}`}
              type="button"
              onClick={() => handleChoiceSelect(opt)}
              className="flex items-center gap-3.5 p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50 text-left transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-brand-500 group-hover:text-white flex items-center justify-center shrink-0 text-slate-400 transition-all">
                {opt.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400">
          Déjà partenaire ?{' '}
          <a href="/login" className="text-brand-500 hover:text-brand-600 font-medium">
            Se connecter
          </a>
        </p>
      </div>
    )
  }

  // ── Étape 2 : formulaire ────────────────────────────────────────────────────

  const selectedOption = ACCOUNT_OPTIONS.find(
    o => o.role === choice?.role && o.accountType === choice?.accountType,
  )
  const isLoueur = choice?.role === 'loueur'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Retour + type sélectionné */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Retour
        </button>
        {selectedOption && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full">
            {selectedOption.icon}
            {selectedOption.label}
          </span>
        )}
      </div>

      {/* Champs communs */}
      <div className="grid grid-cols-2 gap-3">
        <input
          value={firstName}
          onChange={e => { setFirstName(e.target.value); setError(null) }}
          placeholder="Prénom *"
          className={inputCls}
          required
        />
        <input
          value={lastName}
          onChange={e => { setLastName(e.target.value); setError(null) }}
          placeholder="Nom *"
          className={inputCls}
          required
        />
      </div>

      {!isLoueur && (
        <input
          value={contactFunction}
          onChange={e => setContactFunction(e.target.value)}
          placeholder="Fonction dans l'organisation *"
          className={inputCls}
          required
        />
      )}

      <input
        value={companyName}
        onChange={e => setCompanyName(e.target.value)}
        placeholder="Organisation / société *"
        className={inputCls}
        required
      />

      {!isLoueur && (
        <>
          <input
            value={siret}
            onChange={e => setSiret(e.target.value)}
            placeholder="SIRET (optionnel)"
            className={inputCls}
          />
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Adresse"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
              placeholder="Code postal"
              className={inputCls}
            />
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Ville"
              className={inputCls}
            />
          </div>
        </>
      )}

      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(null) }}
        placeholder="Email professionnel *"
        className={inputCls}
        autoComplete="email"
        required
      />

      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Téléphone *"
        className={inputCls}
        required={!isLoueur}
      />

      {!isLoueur && (
        <>
          <input
            value={interventionZone}
            onChange={e => setInterventionZone(e.target.value)}
            placeholder="Zone principale d'intervention (ex. Île-de-France, national…)"
            className={inputCls}
          />
          <input
            type="number"
            min={0}
            value={monthlyEstimate}
            onChange={e => setMonthlyEstimate(e.target.value)}
            placeholder="Nombre estimé de demandes par mois"
            className={inputCls}
          />
        </>
      )}

      {/* Champs spécifiques — assistance */}
      {choice?.accountType === 'assistance' && (
        <div className="flex flex-col gap-3 pt-1 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
            Informations assistance
          </p>
          <input
            value={assistPlatform}
            onChange={e => setAssistPlatform(e.target.value)}
            placeholder="Compagnie ou plateforme d'assistance"
            className={inputCls}
          />
          <input
            value={assistDossiers}
            onChange={e => setAssistDossiers(e.target.value)}
            placeholder="Types de dossiers traités (sinistres auto, VR, etc.)"
            className={inputCls}
          />
        </div>
      )}

      {/* Champs spécifiques — insurance_agent */}
      {choice?.accountType === 'insurance_agent' && (
        <div className="flex flex-col gap-3 pt-1 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
            Informations assurance
          </p>
          <input
            value={agentNetwork}
            onChange={e => setAgentNetwork(e.target.value)}
            placeholder="Compagnie ou réseau"
            className={inputCls}
          />
          <input
            value={agentOrias}
            onChange={e => setAgentOrias(e.target.value)}
            placeholder="N° ORIAS (optionnel)"
            className={inputCls}
          />
          <input
            value={agentClientele}
            onChange={e => setAgentClientele(e.target.value)}
            placeholder="Type de clientèle"
            className={inputCls}
          />
        </div>
      )}

      {/* Champs spécifiques — garage */}
      {choice?.accountType === 'garage' && (
        <div className="flex flex-col gap-3 pt-1 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
            Informations garage
          </p>
          <input
            value={garageType}
            onChange={e => setGarageType(e.target.value)}
            placeholder="Type d'établissement (carrosserie, mécanique, concession…)"
            className={inputCls}
          />
          <input
            type="number"
            min={0}
            value={garageCourtesy}
            onChange={e => setGarageCourtesy(e.target.value)}
            placeholder="Véhicules de courtoisie disponibles (nombre)"
            className={inputCls}
          />
          <input
            value={garageNeed}
            onChange={e => setGarageNeed(e.target.value)}
            placeholder="Besoin principal (description libre)"
            className={inputCls}
          />
        </div>
      )}

      {/* Message libre */}
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Message libre (optionnel) — contexte, questions…"
        rows={3}
        className={`${inputCls} resize-none`}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!email || !firstName || !lastName || !companyName || loading}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi…</>
          : 'Envoyer ma demande →'
        }
      </button>

      <p className="text-center text-xs text-slate-400">
        Déjà partenaire ?{' '}
        <a href="/login" className="text-brand-500 hover:text-brand-600 font-medium">
          Se connecter
        </a>
      </p>
    </form>
  )
}
