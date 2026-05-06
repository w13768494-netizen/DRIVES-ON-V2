import { LOUEUR_STATUS_LABELS, REQUEST_STATUS_COLORS } from '@/types/request'
import type { RequestStatus } from '@/types/request'

interface Props {
  status: RequestStatus
  pulse?: boolean
}

export function LoueurStatusBadge({ status, pulse = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${REQUEST_STATUS_COLORS[status]}`}>
      {pulse && status === 'envoyee' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      )}
      {LOUEUR_STATUS_LABELS[status]}
    </span>
  )
}
