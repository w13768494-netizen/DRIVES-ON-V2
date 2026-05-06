'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MapPin } from 'lucide-react'
import { geocodeAddress } from '@/services/geocodingService'
import type { RentalAgency } from '@/types/rentalAgency'

const schema = z.object({
  name:             z.string().min(1, 'Nom obligatoire'),
  address:          z.string().min(3, 'Adresse obligatoire'),
  city:             z.string().min(1, 'Ville obligatoire'),
  postalCode:       z.string().min(4, 'Code postal obligatoire'),
  latitude:         z.coerce.number({ invalid_type_error: 'Latitude invalide' }),
  longitude:        z.coerce.number({ invalid_type_error: 'Longitude invalide' }),
  serviceRadiusKm:  z.coerce.number().min(1, 'Rayon min. 1 km'),
  phone:            z.string().min(8, 'Téléphone invalide'),
  email:            z.string().email('Email invalide'),
  contactName:      z.string().min(1, 'Nom du contact obligatoire'),
  isAvailable:      z.boolean(),
  weekdays:         z.string().min(1, 'Horaires semaine obligatoires'),
  saturday:         z.string().optional(),
  sunday:           z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type AgencyFormData = Omit<RentalAgency, 'id'>

interface Props {
  initial?:   Partial<RentalAgency>
  brandId:    string
  onSave:     (data: AgencyFormData) => Promise<void>
  onCancel:   () => void
}

function toFormValues(agency?: Partial<RentalAgency>): Partial<FormValues> {
  if (!agency) return { isAvailable: true, serviceRadiusKm: 30 }
  return {
    name:            agency.name,
    address:         agency.address,
    city:            agency.city,
    postalCode:      agency.postalCode,
    latitude:        agency.latitude,
    longitude:       agency.longitude,
    serviceRadiusKm: agency.serviceRadiusKm,
    phone:           agency.phone,
    email:           agency.email,
    contactName:     agency.contactName,
    isAvailable:     agency.isAvailable ?? true,
    weekdays:        agency.openingHours?.weekdays ?? '',
    saturday:        agency.openingHours?.saturday ?? '',
    sunday:          agency.openingHours?.sunday ?? '',
  }
}

const lc = 'block text-xs text-slate-500 mb-1'
const ic = (err: boolean) => [
  'w-full px-3 py-2 rounded-xl border text-slate-800 text-sm',
  'focus:outline-none focus:ring-2 focus:ring-brand-400',
  err ? 'border-red-400 bg-red-50' : 'border-slate-200',
].join(' ')

export function AgencyForm({ initial, brandId, onSave, onCancel }: Props) {
  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving]       = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initial),
  })

  async function geocode(address: string, city: string, postalCode: string) {
    setGeocoding(true)
    const result = await geocodeAddress(`${address}, ${postalCode} ${city}`)
    setGeocoding(false)
    if (result) {
      setValue('latitude',  result.latitude,  { shouldValidate: true })
      setValue('longitude', result.longitude, { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    await onSave({
      brandId,
      name:            values.name,
      address:         values.address,
      city:            values.city,
      postalCode:      values.postalCode,
      latitude:        values.latitude,
      longitude:       values.longitude,
      serviceRadiusKm: values.serviceRadiusKm,
      phone:           values.phone,
      email:           values.email,
      contactName:     values.contactName,
      isAvailable:     values.isAvailable,
      openingHours: {
        weekdays: values.weekdays,
        saturday: values.saturday || null,
        sunday:   values.sunday   || null,
      },
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={lc}>Nom de l'agence *</label>
          <input {...register('name')} placeholder="AutoLoc Paris Est" className={ic(!!errors.name)} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className={lc}>Adresse *</label>
          <input {...register('address')} placeholder="42 rue de la Paix" className={ic(!!errors.address)} />
          {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
        </div>
        <div>
          <label className={lc}>Ville *</label>
          <input {...register('city')} placeholder="Paris" className={ic(!!errors.city)} />
        </div>
        <div>
          <label className={lc}>Code postal *</label>
          <input {...register('postalCode')} placeholder="75011" className={ic(!!errors.postalCode)} />
        </div>
        <div>
          <label className={lc}>Rayon de service (km) *</label>
          <input type="number" {...register('serviceRadiusKm')} min={1} className={ic(!!errors.serviceRadiusKm)} />
        </div>
      </div>

      {/* GPS */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={lc}>Coordonnées GPS *</label>
          <button
            type="button"
            onClick={() => {
              const a = (document.querySelector('[name=address]') as HTMLInputElement)?.value
              const c = (document.querySelector('[name=city]') as HTMLInputElement)?.value
              const p = (document.querySelector('[name=postalCode]') as HTMLInputElement)?.value
              geocode(a, c, p)
            }}
            disabled={geocoding}
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors disabled:opacity-50"
          >
            {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
            Géocoder l'adresse
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input type="number" step="any" {...register('latitude')} placeholder="48.8566" className={ic(!!errors.latitude)} />
            {errors.latitude && <p className="text-xs text-red-500 mt-1">{errors.latitude.message}</p>}
          </div>
          <div>
            <input type="number" step="any" {...register('longitude')} placeholder="2.3522" className={ic(!!errors.longitude)} />
            {errors.longitude && <p className="text-xs text-red-500 mt-1">{errors.longitude.message}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={lc}>Téléphone *</label>
          <input {...register('phone')} placeholder="01 42 00 11 22" className={ic(!!errors.phone)} />
        </div>
        <div>
          <label className={lc}>Email *</label>
          <input {...register('email')} type="email" placeholder="agence@exemple.fr" className={ic(!!errors.email)} />
        </div>
        <div>
          <label className={lc}>Contact principal *</label>
          <input {...register('contactName')} placeholder="Jean Dupont" className={ic(!!errors.contactName)} />
        </div>
      </div>

      <div>
        <p className={lc}>Horaires</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-0.5 block">Semaine *</label>
            <input {...register('weekdays')} placeholder="08:00–19:00" className={ic(!!errors.weekdays)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-0.5 block">Samedi</label>
            <input {...register('saturday')} placeholder="09:00–17:00" className={ic(false)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-0.5 block">Dimanche</label>
            <input {...register('sunday')} placeholder="Fermé" className={ic(false)} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isAvailable" {...register('isAvailable')} className="accent-brand-500 w-4 h-4" />
        <label htmlFor="isAvailable" className="text-sm text-slate-700">Agence disponible</label>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {initial ? 'Enregistrer' : 'Créer l\'agence'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl border border-slate-200 transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}
