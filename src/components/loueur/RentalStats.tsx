import { Bell, CheckCircle2, Car, ArrowRightLeft } from 'lucide-react'
import { getDisplayStatus } from '@/lib/displayStatus'
import type { ReceivedRequest } from '@/types/loueur'

interface Props {
  requests: ReceivedRequest[]
}

export function RentalStats({ requests }: Props) {
  const nouvelles  = requests.filter(r => r.status === 'envoyee' || r.status === 'recue').length
  const confirmees = requests.filter(r => r.status === 'confirmee').length
  const enCours    = requests.filter(r => getDisplayStatus(r.status, r.dateNeeded) === 'en_cours').length
  const transferts = requests.filter(r => r.status === 'transfert_propose').length

  const stats = [
    { value: nouvelles,  label: 'Nouvelles',  icon: Bell,           color: 'text-amber-500',  dot: 'bg-amber-400',  iconBg: 'bg-amber-50'  },
    { value: confirmees, label: 'Confirmées', icon: CheckCircle2,   color: 'text-green-500',  dot: 'bg-green-500',  iconBg: 'bg-green-50'  },
    { value: enCours,    label: 'En cours',   icon: Car,            color: 'text-brand-500',  dot: 'bg-brand-500',  iconBg: 'bg-brand-50'  },
    { value: transferts, label: 'Transferts', icon: ArrowRightLeft, color: 'text-orange-500', dot: 'bg-orange-400', iconBg: 'bg-orange-50' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => {
        const Icon = s.icon
        return (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 shadow-sm">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.iconBg}`}>
              <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none tabular-nums">{s.value}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
