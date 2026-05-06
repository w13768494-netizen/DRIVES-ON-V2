import type { RequestStatus } from '@/types/request'

export type DisplayStatusType =
  | 'en_attente'
  | 'confirmee'
  | 'en_cours'
  | 'en_attente_paiement'
  | 'cloturee'

export const DISPLAY_STATUS_LABELS: Record<DisplayStatusType, string> = {
  en_attente:          'En attente de réponse',
  confirmee:           'Réservation confirmée',
  en_cours:            'En cours de location',
  en_attente_paiement: 'En attente de paiement',
  cloturee:            'Clôturé',
}

export const DISPLAY_STATUS_STYLES: Record<DisplayStatusType, { badge: string; dot: string }> = {
  en_attente:          { badge: 'bg-amber-50   text-amber-700',   dot: 'bg-amber-500'   },
  confirmee:           { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  en_cours:            { badge: 'bg-orange-50  text-orange-700',  dot: 'bg-orange-500'  },
  en_attente_paiement: { badge: 'bg-blue-50    text-blue-700',    dot: 'bg-blue-500'    },
  cloturee:            { badge: 'bg-slate-100  text-slate-500',   dot: 'bg-slate-400'   },
}

export function getDisplayStatus(
  status: RequestStatus,
  dateNeeded?: Date | string,
): DisplayStatusType {
  if (status === 'confirmee') {
    if (dateNeeded && new Date(dateNeeded) <= new Date()) return 'en_cours'
    return 'confirmee'
  }
  if (status === 'honoree')  return 'en_attente_paiement'
  if (status === 'cloturee') return 'cloturee'
  return 'en_attente'
}
