import { Globe, Mail, Phone } from 'lucide-react'
import type { RentalBrand } from '@/types/rentalBrand'

interface Props {
  brand: RentalBrand
}

export function RentalBrandProfile({ brand }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">{brand.name}</h2>
          {brand.description && (
            <p className="text-sm text-slate-500 mt-1">{brand.description}</p>
          )}
        </div>
        <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-mono">{brand.id}</span>
      </div>
      <div className="flex flex-col gap-2 text-sm text-slate-600">
        {brand.email && (
          <span className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" />
            {brand.email}
          </span>
        )}
        {brand.phone && (
          <span className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            {brand.phone}
          </span>
        )}
        {brand.website && (
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            {brand.website}
          </span>
        )}
      </div>
    </div>
  )
}
