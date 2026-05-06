import { addDays } from 'date-fns'
import { getEffectiveDuration } from '@/types/request'
import type { AssistanceRequest } from '@/types/request'

export function getEndDate(request: AssistanceRequest): Date {
  return addDays(new Date(request.dateNeeded), getEffectiveDuration(request))
}

/** Dernier jour où une prolongation peut être demandée (1 jour avant la fin) */
export function getExtensionDeadline(request: AssistanceRequest): Date {
  return addDays(getEndDate(request), -1)
}

export type RentalAlertState = 'none' | 'extension_urgent' | 'overdue'

export function getRentalAlertState(request: AssistanceRequest): RentalAlertState {
  if (request.status !== 'confirmee') return 'none'
  const now = new Date()
  const endDate = getEndDate(request)
  if (now >= endDate) return 'overdue'
  const deadline = getExtensionDeadline(request)
  const hasPendingExt = (request.extensions ?? []).some(e => e.status === 'en_attente')
  if (now >= deadline && !hasPendingExt) return 'extension_urgent'
  return 'none'
}
