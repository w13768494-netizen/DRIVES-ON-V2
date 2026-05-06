import { FileText, Clock } from 'lucide-react'
import type { AssistanceRequest } from '@/types/request'
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '@/types/request'

interface Props {
  requests: AssistanceRequest[]
}

function timeAgo(date: Date | string): string {
  const d   = date instanceof Date ? date : new Date(date as string)
  const now = new Date()
  const h   = Math.floor((now.getTime() - d.getTime()) / 3_600_000)
  if (h < 1)  return 'À l\'instant'
  if (h < 24) return `Il y a ${h}h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Hier'
  return `Il y a ${days}j`
}

export function AssistanceUserActivity({ requests }: Props) {
  const recent = [...requests]
    .sort((a, b) => {
      const aMs = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as string).getTime()
      const bMs = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as string).getTime()
      return bMs - aMs
    })
    .slice(0, 5)

  if (recent.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        Aucune activité récente
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recent.map(r => {
        const createdMs = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string)
        return (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700 truncate">
                  {r.sinistre.lastName} {r.sinistre.firstName}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${REQUEST_STATUS_COLORS[r.status]}`}>
                  {REQUEST_STATUS_LABELS[r.status]}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{r.dossierNumber}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
              <Clock className="w-3 h-3" />
              {timeAgo(createdMs)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
