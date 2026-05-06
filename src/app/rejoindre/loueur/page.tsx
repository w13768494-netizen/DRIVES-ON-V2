'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Truck, Building2, User, FileText } from 'lucide-react'
import { submitCandidature } from '@/services/candidatureService'
import { VEHICLE_TYPE_OPTIONS } from '@/types/candidature'

interface FormData {
  companyName: string; siret: string; address: string; city: string; postalCode: string; website: string
  contactFirstName: string; contactLastName: string; contactTitle: string; email: string; phone: string
  agencyCount: string; fleetSize: string; vehicleTypes: string[]; message: string
}

const INITIAL: FormData = {
  companyName: '', siret: '', address: '', city: '', postalCode: '', website: '',
  contactFirstName: '', contactLastName: '', contactTitle: '', email: '', phone: '',
  agencyCount: '', fleetSize: '', vehicleTypes: [], message: '',
}

const STEPS = [
  { label: 'Votre entreprise', icon: Building2 },
  { label: 'Votre contact',    icon: User },
  { label: 'Votre flotte',     icon: FileText },
]

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done   = i < step
        const active = i === step
        const Icon   = s.icon
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                done   ? 'bg-brand-500 border-brand-500 text-white'
                : active ? 'bg-white border-brand-500 text-brand-500'
                :          'bg-white border-slate-200 text-slate-400'
              }`}>
                {done
                  ? <CheckCircle2 className="w-5 h-5" />
                  : <Icon className="w-4 h-4" />
                }
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${active ? 'text-brand-600' : done ? 'text-slate-500' : 'text-slate-300'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 rounded ${i < step ? 'bg-brand-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all'

export default function RejoindreloueurPage() {
  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState<FormData>(INITIAL)
  const [errors, setErrors]   = useState<Partial<Record<keyof FormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]       = useState(false)

  const set = (k: keyof FormData, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function toggleVehicleType(value: string) {
    setForm(f => ({
      ...f,
      vehicleTypes: f.vehicleTypes.includes(value)
        ? f.vehicleTypes.filter(v => v !== value)
        : [...f.vehicleTypes, value],
    }))
    setErrors(e => ({ ...e, vehicleTypes: undefined }))
  }

  function validateStep(s: number): boolean {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (s === 0) {
      if (!form.companyName.trim()) e.companyName = 'Champ requis'
      if (!form.siret.trim() || form.siret.replace(/\s/g, '').length !== 14) e.siret = 'SIRET invalide (14 chiffres)'
      if (!form.address.trim()) e.address = 'Champ requis'
      if (!form.city.trim())    e.city    = 'Champ requis'
      if (!form.postalCode.trim() || !/^\d{5}$/.test(form.postalCode)) e.postalCode = 'Code postal invalide'
    }
    if (s === 1) {
      if (!form.contactFirstName.trim()) e.contactFirstName = 'Champ requis'
      if (!form.contactLastName.trim())  e.contactLastName  = 'Champ requis'
      if (!form.contactTitle.trim())     e.contactTitle     = 'Champ requis'
      if (!form.email.trim() || !form.email.includes('@')) e.email = 'Email invalide'
      if (!form.phone.trim()) e.phone = 'Champ requis'
    }
    if (s === 2) {
      if (!form.agencyCount.trim() || isNaN(Number(form.agencyCount)) || Number(form.agencyCount) < 1) e.agencyCount = 'Nombre invalide'
      if (!form.fleetSize.trim()   || isNaN(Number(form.fleetSize))   || Number(form.fleetSize)   < 1) e.fleetSize   = 'Nombre invalide'
      if (form.vehicleTypes.length === 0) e.vehicleTypes = 'Sélectionnez au moins un type de véhicule'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() { if (validateStep(step)) setStep(s => s + 1) }
  function back() { setStep(s => s - 1) }

  async function handleSubmit() {
    if (!validateStep(2)) return
    setSubmitting(true)
    await submitCandidature({
      role: 'loueur',
      companyName: form.companyName, siret: form.siret,
      address: form.address, city: form.city, postalCode: form.postalCode,
      website: form.website || undefined,
      contactFirstName: form.contactFirstName, contactLastName: form.contactLastName,
      contactTitle: form.contactTitle, email: form.email, phone: form.phone,
      agencyCount:  Number(form.agencyCount),
      fleetSize:    Number(form.fleetSize),
      vehicleTypes: form.vehicleTypes,
      message: form.message || undefined,
    })
    setSubmitting(false)
    setDone(true)
  }

  if (done) return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Candidature envoyée !</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Votre dossier a bien été transmis à l'équipe Drives On. Vous recevrez une réponse à l'adresse <strong>{form.email}</strong> sous <strong>48 heures ouvrées</strong>.
        </p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        <Link href="/rejoindre" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Candidature Loueur</h1>
            <p className="text-xs text-slate-500">Étape {step + 1} sur {STEPS.length}</p>
          </div>
        </div>

        <StepIndicator step={step} />

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">

          {/* ── Étape 1 : Entreprise ── */}
          {step === 0 && (
            <>
              <Field label="Raison sociale" required>
                <input value={form.companyName} onChange={e => set('companyName', e.target.value)}
                  placeholder="Ex : Location Auto Provence" className={inputCls} />
                {errors.companyName && <p className="text-xs text-red-500">{errors.companyName}</p>}
              </Field>
              <Field label="Numéro SIRET" required>
                <input value={form.siret} onChange={e => set('siret', e.target.value)}
                  placeholder="14 chiffres" maxLength={17} className={inputCls} />
                {errors.siret && <p className="text-xs text-red-500">{errors.siret}</p>}
              </Field>
              <Field label="Adresse du siège" required>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Ex : 12 avenue de la Gare" className={inputCls} />
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code postal" required>
                  <input value={form.postalCode} onChange={e => set('postalCode', e.target.value)}
                    placeholder="75001" maxLength={5} className={inputCls} />
                  {errors.postalCode && <p className="text-xs text-red-500">{errors.postalCode}</p>}
                </Field>
                <Field label="Ville" required>
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Paris" className={inputCls} />
                  {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                </Field>
              </div>
              <Field label="Site web">
                <input value={form.website} onChange={e => set('website', e.target.value)}
                  placeholder="https://votre-site.fr" type="url" className={inputCls} />
              </Field>
            </>
          )}

          {/* ── Étape 2 : Contact ── */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom" required>
                  <input value={form.contactFirstName} onChange={e => set('contactFirstName', e.target.value)}
                    placeholder="Jean" className={inputCls} />
                  {errors.contactFirstName && <p className="text-xs text-red-500">{errors.contactFirstName}</p>}
                </Field>
                <Field label="Nom" required>
                  <input value={form.contactLastName} onChange={e => set('contactLastName', e.target.value)}
                    placeholder="DUPONT" className={inputCls} />
                  {errors.contactLastName && <p className="text-xs text-red-500">{errors.contactLastName}</p>}
                </Field>
              </div>
              <Field label="Fonction" required>
                <input value={form.contactTitle} onChange={e => set('contactTitle', e.target.value)}
                  placeholder="Ex : Gérant, Responsable commercial…" className={inputCls} />
                {errors.contactTitle && <p className="text-xs text-red-500">{errors.contactTitle}</p>}
              </Field>
              <Field label="Adresse email professionnelle" required>
                <input value={form.email} onChange={e => set('email', e.target.value)}
                  type="email" placeholder="jean.dupont@location.fr" className={inputCls} />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </Field>
              <Field label="Téléphone" required>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  type="tel" placeholder="01 23 45 67 89" className={inputCls} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </Field>
            </>
          )}

          {/* ── Étape 3 : Flotte ── */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre d'agences" required>
                  <input value={form.agencyCount} onChange={e => set('agencyCount', e.target.value)}
                    type="number" min="1" placeholder="Ex : 3" className={inputCls} />
                  {errors.agencyCount && <p className="text-xs text-red-500">{errors.agencyCount}</p>}
                </Field>
                <Field label="Taille de la flotte" required>
                  <input value={form.fleetSize} onChange={e => set('fleetSize', e.target.value)}
                    type="number" min="1" placeholder="Ex : 45" className={inputCls} />
                  {errors.fleetSize && <p className="text-xs text-red-500">{errors.fleetSize}</p>}
                </Field>
              </div>

              <Field label="Types de véhicules proposés" required>
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  {VEHICLE_TYPE_OPTIONS.map(opt => {
                    const checked = form.vehicleTypes.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleVehicleType(opt.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${
                          checked
                            ? 'bg-brand-50 border-brand-400 text-brand-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                          checked ? 'bg-brand-500 border-brand-500' : 'border-slate-300'
                        }`}>
                          {checked && (
                            <svg viewBox="0 0 10 8" className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {errors.vehicleTypes && <p className="text-xs text-red-500">{errors.vehicleTypes}</p>}
              </Field>

              <Field label="Message (optionnel)">
                <textarea value={form.message} onChange={e => set('message', e.target.value)}
                  rows={3} placeholder="Présentez vos agences, zone géographique, disponibilités…"
                  className={inputCls + ' resize-none'} />
              </Field>
              <p className="text-xs text-slate-400">
                En soumettant ce formulaire, vous acceptez que Drives On traite vos données dans le cadre de votre demande de partenariat.
              </p>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          {step > 0
            ? <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" /> Précédent
              </button>
            : <div />
          }
          {step < STEPS.length - 1
            ? <button onClick={next} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm">
                Suivant <ArrowRight className="w-4 h-4" />
              </button>
            : <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours…</> : <>Envoyer ma candidature <ArrowRight className="w-4 h-4" /></>}
              </button>
          }
        </div>
      </div>
    </div>
  )
}
