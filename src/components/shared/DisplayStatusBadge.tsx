import { getDisplayStatus, DISPLAY_STATUS_LABELS, DISPLAY_STATUS_STYLES } from '@/lib/displayStatus'
import type { RequestStatus } from '@/types/request'

interface Props {
  status:      RequestStatus
  dateNeeded?: Date | string
}

export function DisplayStatusBadge({ status, dateNeeded }: Props) {
  const display = getDisplayStatus(status, dateNeeded)
  const { badge, dot } = DISPLAY_STATUS_STYLES[display]
  const isPulse = status === 'envoyee' || status === 'recue'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${isPulse ? 'animate-pulse' : ''}`} />
      {DISPLAY_STATUS_LABELS[display]}
    </span>
  )
}
