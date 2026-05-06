import { Clock, AlertTriangle, TrendingUp, CalendarDays } from 'lucide-react'
import { getRentalAlertState } from '@/lib/rentalDates'
import type { AssistanceRequest } from '@/types/request'

interface Props {
  requests:       AssistanceRequest[]
  onTodayClick?:  () => void
  todayActive?:   boolean
}

export function RequestStats({ requests, onTodayClick, todayActive }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const actives    = requests.filter(r => !['cloturee', 'honoree'].includes(r.status)).length
  const enAttente  = requests.filter(r => r.status === 'envoyee' || r.status === 'recue').length
  const overdue    = requests.filter(r => getRentalAlertState(r) === 'overdue').length
  const todayCount = requests.filter(r => r.createdAt >= today).length

  const stats = [
    { value: actives,    label: 'Actives',      icon: TrendingUp,    color: 'text-brand-500', dot: 'bg-brand-500', iconBg: 'bg-brand-50',  onClick: undefined, active: false },
    { value: enAttente,  label: 'En attente',   icon: Clock,         color: 'text-amber-500', dot: 'bg-amber-400', iconBg: 'bg-amber-50',  onClick: undefined, active: false },
    { value: overdue,    label: 'Overdue',       icon: AlertTriangle, color: 'text-red-500',   dot: 'bg-red-500',   iconBg: 'bg-red-50',    onClick: undefined, active: false },
    { value: todayCount, label: "Créées auj.",  icon: CalendarDays,  color: todayActive ? 'text-brand-600' : 'text-slate-400', dot: todayActive ? 'bg-brand-500' : 'bg-slate-300', iconBg: todayActive ? 'bg-brand-50' : 'bg-slate-50', onClick: onTodayClick, active: todayActive },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => {
        const Icon = s.icon
        const card = (
          <div className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 shadow-sm transition-all ${
            s.active
              ? 'border-brand-300 ring-2 ring-brand-200'
              : s.onClick
              ? 'border-slate-100 hover:border-brand-200 hover:shadow-md cursor-pointer'
              : 'border-slate-100'
          }`}>
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
        return s.onClick
          ? <button key={s.label} onClick={s.onClick} className="text-left">{card}</button>
          : <div key={s.label}>{card}</div>
      })}
    </div>
  )
}
