'use client'

import { useState, useMemo } from 'react'
import { addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MapPin, Car, Calendar, Clock, FileText, ChevronRight,
  Hash, User, Phone, Mail, CreditCard, AlertCircle,
  ShieldCheck, ShieldAlert, Euro, Truck, Zap, CalendarClock,
  CheckCircle2, XCircle, Fuel, Wallet,
} from 'lucide-react'
import { geocodeAddress } from '@/services/geocodingService'
import type { RequestFormInput } from '@/types/request'
import type { AccountType } from '@/types/session'
import {
  VEHICLE_CATEGORY_LABELS, TOURISME_CATEGORIES, UTILITAIRE_CATEGORIES,
  type VehicleCategoryType, type VehicleGroupType,
} from '@/types/vehicleCategory'

const VEHICLE_CATEGORY_ENUM = [
  'citadine', 'compacte', 'berline', 'suv', '7_places', 'electrique', 'hybride', 'premium',
  'petit_utilitaire', 'fourgon_3m3', 'fourgon_6m3', 'fourgon_12m3', 'camion_20m3', 'benne', 'frigorifique',
] as const satisfies readonly VehicleCategoryType[]

// ── Static form value type ────────────────────────────────────────────────────

type FormValues = {
  requestType:       'immediate' | 'planifiee'
  dossierNumber:     string
  referenceNumber?:  string
  creditType:        'full' | 'partial' | 'client'
  lastName:          string
  firstName:         string
  phone:             string
  email?:            string
  licenseNumber?:    string
  address:           string
  vehicleGroup:      'tourisme' | 'utilitaire'
  vehicleCategory:   VehicleCategoryType
  dateNeeded:        string
  durationDays:      number
  maxExtensionDays?: number | ''
  notes?:            string
}

// ── Config par type de compte ─────────────────────────────────────────────────

const ACCOUNT_CONFIG = {
  assistance: {
    dossierLabel:       'N° de sinistre',
    dossierPlaceholder: 'SIN-2024-00123',
    dossierRequired:    true,
    pecTitle:           'Prise en charge',
    clientSectionTitle: 'Informations sinistré',
    clientLabel:        'sinistré',
  },
  insurance_agent: {
    dossierLabel:       'N° de dossier / contrat',
    dossierPlaceholder: 'DOS-2024-00123',
    dossierRequired:    true,
    pecTitle:           'Couverture contrat',
    clientSectionTitle: 'Informations du client assuré',
    clientLabel:        'client',
  },
  garage: {
    dossierLabel:       'Ordre de réparation',
    dossierPlaceholder: 'OR-2024-00123',
    dossierRequired:    false,
    pecTitle:           'Prise en charge assurance',
    clientSectionTitle: 'Informations du client',
    clientLabel:        'client',
  },
} satisfies Record<AccountType, {
  dossierLabel: string
  dossierPlaceholder: string
  dossierRequired: boolean
  pecTitle: string
  clientSectionTitle: string
  clientLabel: string
}>

// ── Composant ─────────────────────────────────────────────────────────────────

interface Props {
  accountType?: AccountType
  onSubmit:     (input: RequestFormInput) => void
  loading:      boolean
}

export function AssistanceRequestForm({ onSubmit, loading, accountType = 'assistance' }: Props) {
  const [geocodeError, setGeocodeError]           = useState<string | null>(null)
  const [geocoding, setGeocoding]                 = useState(false)
  const [hasInsuranceCoverage, setHasInsuranceCoverage] = useState(false)

  const cfg = ACCOUNT_CONFIG[accountType]

  const schema = useMemo(() => z.object({
    requestType:     z.enum(['immediate', 'planifiee'] as const, { required_error: 'Choisissez le type de demande' }),
    dossierNumber:   cfg.dossierRequired
      ? z.string().min(1, 'Le numéro de dossier est obligatoire')
      : z.string(),
    referenceNumber: z.string().optional(),
    creditType:      z.enum(['full', 'partial', 'client'] as const, { required_error: 'Sélectionnez le type de prise en charge' }),
    lastName:        z.string().min(1, 'Le nom est obligatoire'),
    firstName:       z.string().min(1, 'Le prénom est obligatoire'),
    phone:           z.string().min(8, 'Téléphone invalide'),
    email:           z.string().email('Email invalide').optional().or(z.literal('')),
    licenseNumber:   z.string().optional(),
    address:         z.string().min(5, 'Saisissez une adresse complète'),
    vehicleGroup:    z.enum(['tourisme', 'utilitaire'] as const, { required_error: 'Choisissez le type de véhicule' }),
    vehicleCategory: z.enum([...VEHICLE_CATEGORY_ENUM] as [VehicleCategoryType, ...VehicleCategoryType[]], { required_error: 'Choisissez une catégorie' }),
    dateNeeded:      z.string().min(1, "Indiquez la date et l'heure souhaitées"),
    durationDays:    z.coerce.number().int().min(1, 'Minimum 1 jour').max(90, 'Maximum 90 jours'),
    maxExtensionDays: z.coerce.number().int().min(1).max(90).optional().or(z.literal('')),
    notes:           z.string().optional(),
  }), [cfg.dossierRequired])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    resetField,
    formState: { errors },
  } = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: { durationDays: 3, creditType: 'full', requestType: 'immediate' },
  })

  const creditType      = useWatch({ control, name: 'creditType' })
  const vehicleGroup    = useWatch({ control, name: 'vehicleGroup' })
  const requestType     = useWatch({ control, name: 'requestType' })
  const dateNeededVal   = useWatch({ control, name: 'dateNeeded' })
  const durationDaysVal = useWatch({ control, name: 'durationDays' })

  const endDatePreview = useMemo(() => {
    if (!dateNeededVal || !durationDaysVal) return null
    const start = new Date(dateNeededVal)
    if (isNaN(start.getTime())) return null
    return addDays(start, Number(durationDaysVal))
  }, [dateNeededVal, durationDaysVal])

  const visibleCategories = vehicleGroup === 'tourisme'
    ? TOURISME_CATEGORIES
    : vehicleGroup === 'utilitaire'
    ? UTILITAIRE_CATEGORIES
    : []

  function handleGroupChange(group: VehicleGroupType) {
    setValue('vehicleGroup', group)
    resetField('vehicleCategory')
  }

  function handleToggleCoverage(checked: boolean) {
    setHasInsuranceCoverage(checked)
    setValue('creditType', checked ? 'full' : 'client')
  }

  async function handleFormSubmit(values: FormValues) {
    setGeocodeError(null)
    setGeocoding(true)
    let result
    try {
      result = await geocodeAddress(values.address)
    } finally {
      setGeocoding(false)
    }

    if (!result) {
      setGeocodeError("Adresse introuvable. Vérifiez l'orthographe ou ajoutez la ville.")
      return
    }

    // Garage sans prise en charge → on force 'client' (coverage_type = 'none')
    const effectiveCreditType =
      accountType === 'garage' && !hasInsuranceCoverage ? 'client' : values.creditType

    onSubmit({
      requestType:     values.requestType,
      dossierNumber:   values.dossierNumber,
      referenceNumber: values.referenceNumber || undefined,
      coverage: {
        creditType: effectiveCreditType,
      },
      sinistre: {
        lastName:      values.lastName,
        firstName:     values.firstName,
        phone:         values.phone,
        email:         values.email || undefined,
        licenseNumber: values.licenseNumber || undefined,
      },
      location: {
        address:   values.address,
        latitude:  result.latitude,
        longitude: result.longitude,
      },
      vehicleGroup:     values.vehicleGroup,
      vehicleCategory:  values.vehicleCategory,
      dateNeeded:       new Date(values.dateNeeded),
      durationDays:     values.durationDays,
      maxExtensionDays: values.maxExtensionDays ? Number(values.maxExtensionDays) : undefined,
      notes:            values.notes || undefined,
    })
  }

  const isBusy = loading || geocoding

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">

      {/* ── Type de demande ── */}
      <Section icon={<Zap className="w-4 h-4 text-brand-500" />} title="Type de demande">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={[
            'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
            requestType === 'immediate' ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-red-300',
          ].join(' ')}>
            <input type="radio" value="immediate" {...register('requestType')} className="mt-0.5 accent-red-500" />
            <div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-slate-800 text-sm">Immédiate</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Véhicule nécessaire très rapidement.</p>
            </div>
          </label>
          <label className={[
            'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
            requestType === 'planifiee' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300',
          ].join(' ')}>
            <input type="radio" value="planifiee" {...register('requestType')} className="mt-0.5 accent-brand-500" />
            <div>
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-slate-800 text-sm">Planifiée</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Date précise connue à l'avance.</p>
            </div>
          </label>
        </div>
        {errors.requestType && <FieldError message={errors.requestType.message!} />}
      </Section>

      {/* ── Références dossier ── */}
      <Section icon={<Hash className="w-4 h-4 text-brand-500" />} title="Références dossier">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {cfg.dossierLabel} {cfg.dossierRequired && <Required />}
            </label>
            <input
              {...register('dossierNumber')}
              placeholder={cfg.dossierPlaceholder}
              className={inputClass(!!errors.dossierNumber)}
            />
            {errors.dossierNumber && <FieldError message={errors.dossierNumber.message!} />}
          </div>
          <div>
            <label className={labelClass}>N° de référence</label>
            <input {...register('referenceNumber')} placeholder="REF-456" className={inputClass(false)} />
          </div>
        </div>
      </Section>

      {/* ── Prise en charge ── */}
      {accountType === 'garage' ? (
        <Section icon={<ShieldCheck className="w-4 h-4 text-brand-500" />} title={cfg.pecTitle}>
          <button
            type="button"
            onClick={() => handleToggleCoverage(!hasInsuranceCoverage)}
            className={[
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
              hasInsuranceCoverage
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 bg-white hover:border-slate-300',
            ].join(' ')}
          >
            <div className={[
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              hasInsuranceCoverage ? 'bg-brand-500' : 'bg-slate-200',
            ].join(' ')}>
              <span className={[
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                hasInsuranceCoverage ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Ce dossier bénéficie d'une prise en charge assurance
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Activez si l'assurance couvre tout ou partie de la location
              </p>
            </div>
          </button>

          {hasInsuranceCoverage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {/* Totale */}
              <label className={[
                'relative flex flex-col gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                creditType === 'full'
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-green-300 hover:shadow-sm',
              ].join(' ')}>
                <input type="radio" value="full" {...register('creditType')} className="sr-only" />
                {creditType === 'full' && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${creditType === 'full' ? 'bg-green-500' : 'bg-green-100'}`}>
                    <ShieldCheck className={`w-6 h-6 ${creditType === 'full' ? 'text-white' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Totale</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">100 % pris en charge</p>
                  </div>
                </div>
              </label>

              {/* Partielle */}
              <label className={[
                'relative flex flex-col gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                creditType === 'partial'
                  ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm',
              ].join(' ')}>
                <input type="radio" value="partial" {...register('creditType')} className="sr-only" />
                {creditType === 'partial' && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${creditType === 'partial' ? 'bg-amber-400' : 'bg-amber-100'}`}>
                    <ShieldAlert className={`w-6 h-6 ${creditType === 'partial' ? 'text-white' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Partielle</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Location uniquement</p>
                  </div>
                </div>
              </label>
            </div>
          )}
        </Section>
      ) : (
        <Section icon={<ShieldCheck className="w-4 h-4 text-brand-500" />} title={cfg.pecTitle}>
          <p className="text-xs text-slate-400 -mt-1 mb-3">
            Information transmise au loueur pour la facturation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Totale */}
            <label className={[
              'relative flex flex-col gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden',
              creditType === 'full'
                ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-green-300 hover:shadow-sm',
            ].join(' ')}>
              <input type="radio" value="full" {...register('creditType')} className="sr-only" />
              {creditType === 'full' && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </span>
              )}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${creditType === 'full' ? 'bg-green-500' : 'bg-green-100'}`}>
                  <ShieldCheck className={`w-6 h-6 ${creditType === 'full' ? 'text-white' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Totale</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">100 % pris en charge</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {['Location', 'Franchise', 'Carburant'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />
                    </span>
                    <span className="text-xs text-green-800 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </label>

            {/* Partielle */}
            <label className={[
              'relative flex flex-col gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden',
              creditType === 'partial'
                ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm',
            ].join(' ')}>
              <input type="radio" value="partial" {...register('creditType')} className="sr-only" />
              {creditType === 'partial' && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </span>
              )}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${creditType === 'partial' ? 'bg-amber-400' : 'bg-amber-100'}`}>
                  <ShieldAlert className={`w-6 h-6 ${creditType === 'partial' ? 'text-white' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Partielle</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Location uniquement</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 text-amber-600" />
                  </span>
                  <span className="text-xs text-amber-800 font-medium">Location</span>
                </div>
                {['Franchise', 'Carburant'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <XCircle className="w-2.5 h-2.5 text-slate-400" />
                    </span>
                    <span className="text-xs text-slate-400">
                      {item} <span className="text-slate-300">({cfg.clientLabel})</span>
                    </span>
                  </div>
                ))}
              </div>
            </label>

            {/* Client / Aucune */}
            <label className={[
              'relative flex flex-col gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden',
              creditType === 'client'
                ? 'border-slate-500 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm',
            ].join(' ')}>
              <input type="radio" value="client" {...register('creditType')} className="sr-only" />
              {creditType === 'client' && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </span>
              )}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${creditType === 'client' ? 'bg-slate-600' : 'bg-slate-100'}`}>
                  <Wallet className={`w-6 h-6 ${creditType === 'client' ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Aucune</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">À la charge du {cfg.clientLabel}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {['Location', 'Franchise', 'Carburant'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <XCircle className="w-2.5 h-2.5 text-slate-400" />
                    </span>
                    <span className="text-xs text-slate-400">
                      {item} <span className="text-slate-300">({cfg.clientLabel})</span>
                    </span>
                  </div>
                ))}
              </div>
            </label>
          </div>
        </Section>
      )}

      {/* ── Informations client / sinistré ── */}
      <Section icon={<User className="w-4 h-4 text-brand-500" />} title={cfg.clientSectionTitle}>
        <p className="text-xs text-slate-400 -mt-1 mb-3">Personne qui sera en possession du véhicule.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nom <Required /></label>
            <input {...register('lastName')} placeholder="DUPONT" className={inputClass(!!errors.lastName)} />
            {errors.lastName && <FieldError message={errors.lastName.message!} />}
          </div>
          <div>
            <label className={labelClass}>Prénom <Required /></label>
            <input {...register('firstName')} placeholder="Jean" className={inputClass(!!errors.firstName)} />
            {errors.firstName && <FieldError message={errors.firstName.message!} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${labelClass} flex items-center gap-1`}><Phone className="w-3 h-3" /> Téléphone <Required /></label>
            <input {...register('phone')} type="tel" placeholder="06 00 00 00 00" className={inputClass(!!errors.phone)} />
            {errors.phone && <FieldError message={errors.phone.message!} />}
          </div>
          <div>
            <label className={`${labelClass} flex items-center gap-1`}><Mail className="w-3 h-3" /> Email</label>
            <input {...register('email')} type="email" placeholder="jean.dupont@email.fr" className={inputClass(!!errors.email)} />
            {errors.email && <FieldError message={errors.email.message!} />}
          </div>
        </div>
        <div className="mt-4">
          <label className={`${labelClass} flex items-center gap-1`}><CreditCard className="w-3 h-3" /> N° de permis</label>
          <input {...register('licenseNumber')} placeholder="123456789012" className={inputClass(false)} />
        </div>
      </Section>

      {/* ── Lieu ── */}
      <Section icon={<MapPin className="w-4 h-4 text-brand-500" />} title="Lieu de la panne">
        <div>
          <label className={labelClass}>Adresse complète <Required /></label>
          <input
            {...register('address')}
            placeholder="ex. 24 avenue des Champs-Élysées, Paris  ou  A6 sortie 35, Mâcon"
            className={inputClass(!!errors.address || !!geocodeError)}
          />
          {errors.address  && <FieldError message={errors.address.message!} />}
          {geocodeError && !errors.address && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{geocodeError}
            </p>
          )}
          <p className="mt-1.5 text-xs text-slate-400">Rue, ville, code postal, autoroute… Plus c'est précis, mieux c'est.</p>
        </div>
      </Section>

      {/* ── Véhicule ── */}
      <Section icon={<Car className="w-4 h-4 text-brand-500" />} title="Type de véhicule souhaité">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {([
            { value: 'tourisme',   icon: <Car className="w-5 h-5" />,   label: 'Véhicule de tourisme',  desc: 'Citadine, berline, SUV, électrique…' },
            { value: 'utilitaire', icon: <Truck className="w-5 h-5" />, label: 'Véhicule utilitaire',    desc: 'Fourgon, benne, frigorifique…' },
          ] as const).map(({ value, icon, label, desc }) => (
            <label
              key={value}
              className={[
                'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                vehicleGroup === value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300',
              ].join(' ')}
              onClick={() => handleGroupChange(value)}
            >
              <input type="radio" value={value} {...register('vehicleGroup')} className="sr-only" />
              <span className={vehicleGroup === value ? 'text-brand-500' : 'text-slate-400'}>{icon}</span>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.vehicleGroup && <FieldError message={errors.vehicleGroup.message!} />}
        {vehicleGroup && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visibleCategories.map(cat => (
              <label
                key={cat}
                className="relative flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:border-brand-400 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
              >
                <input type="radio" value={cat} {...register('vehicleCategory')} className="accent-brand-500" />
                <span className="text-sm font-medium text-slate-700">{VEHICLE_CATEGORY_LABELS[cat]}</span>
              </label>
            ))}
          </div>
        )}
        {errors.vehicleCategory && <FieldError message={errors.vehicleCategory.message!} />}
      </Section>

      {/* ── Disponibilité ── */}
      <Section icon={<Calendar className="w-4 h-4 text-brand-500" />} title="Disponibilité">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Date et heure souhaitées <Required /></label>
            <input
              type="datetime-local"
              {...register('dateNeeded')}
              min={(() => {
                const now = new Date()
                const pad = (n: number) => String(n).padStart(2, '0')
                return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
              })()}
              className={inputClass(!!errors.dateNeeded)}
            />
            {errors.dateNeeded && <FieldError message={errors.dateNeeded.message!} />}
          </div>
          <div>
            <label className={`${labelClass} flex items-center gap-1`}><Clock className="w-3 h-3" /> Durée initiale <Required /></label>
            <div className="relative">
              <input type="number" {...register('durationDays')} min={1} max={90}
                className={`${inputClass(!!errors.durationDays)} pr-8`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">j</span>
            </div>
            {errors.durationDays && <FieldError message={errors.durationDays.message!} />}
          </div>
          <div>
            <label className={`${labelClass} flex items-center gap-1`}><Clock className="w-3 h-3" /> Prolongation max.</label>
            <div className="relative">
              <input type="number" {...register('maxExtensionDays')} min={1} max={90} placeholder="—"
                className={`${inputClass(false)} pr-8`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">j</span>
            </div>
          </div>
        </div>

        {endDatePreview && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700">Fin prévue</p>
                <p className="text-xs text-blue-600">
                  {format(endDatePreview, "EEEE d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700">Deadline prolongation</p>
                <p className="text-xs text-amber-600">
                  {format(addDays(endDatePreview, -1), "EEEE d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                </p>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ── Notes ── */}
      <Section icon={<FileText className="w-4 h-4 text-brand-500" />} title="Informations complémentaires">
        <textarea {...register('notes')} rows={3}
          placeholder="Remarques utiles pour le loueur…"
          className={`${inputClass(false)} resize-none`} />
      </Section>

      <button
        type="submit"
        disabled={isBusy}
        className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        {geocoding ? (
          <><Spinner />Géocodage de l'adresse…</>
        ) : loading ? (
          <><Spinner />Recherche des loueurs…</>
        ) : (
          <>Rechercher un loueur <ChevronRight className="w-4 h-4" /></>
        )}
      </button>
    </form>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
        {icon}{title}
      </legend>
      {children}
    </fieldset>
  )
}

function Required() { return <span className="text-red-400">*</span> }

const labelClass = 'block text-xs text-slate-500 mb-1'

function inputClass(hasError: boolean) {
  return [
    'w-full px-4 py-2.5 rounded-xl border text-slate-800 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
    'transition-colors placeholder:text-slate-400',
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white',
  ].join(' ')
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs text-red-500">{message}</p>
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
