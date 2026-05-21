import { getRentalAlertState, getEndDate, getExtensionDeadline } from '@/lib/rentalDates'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { AssistanceRequest }   from '@/types/request'

export type OperationalPriority = 'critique' | 'eleve' | 'normal'

export interface OperationalFlags {
  priority:       OperationalPriority
  reasons:        string[]           // Libellés courts à afficher ("Overdue", "Docs manquants"...)
  deadlineLabel?: string             // "Retour le 22/05 — J+2"
  isActionable:   boolean            // faux si dossier archivé ou clos
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
}

export function relativeTime(date: Date | string): string {
  const mins = minutesSince(date)
  if (mins < 1)    return "À l'instant"
  if (mins < 60)   return `Il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `Il y a ${days}j`
}

export function vehicleLabel(request: AssistanceRequest): string {
  return VEHICLE_CATEGORY_LABELS[request.vehicleCategory] ?? request.vehicleCategory
}

// ── Calcul de priorité ────────────────────────────────────────────────────────

export function computeOperationalFlags(request: AssistanceRequest): OperationalFlags {
  const reasons: string[] = []
  let priority: OperationalPriority = 'normal'
  let deadlineLabel: string | undefined

  const status  = request.status
  const alert   = getRentalAlertState(request)
  const created = minutesSince(request.createdAt)

  // ── CRITIQUE ───────────────────────────────────────────────────────────────

  if (status === 'overdue' || alert === 'overdue') {
    reasons.push('Overdue — retour non effectué')
    priority = 'critique'
    const end = getEndDate(request)
    const daysLate = Math.floor((Date.now() - end.getTime()) / 86_400_000)
    deadlineLabel = daysLate > 0 ? `Retard de ${daysLate}j` : 'Overdue aujourd\'hui'
  }

  if (status === 'litige_degat') {
    reasons.push('Sinistre déclaré — litige en cours')
    priority = 'critique'
  }

  if (
    request.requestType === 'immediate' &&
    ['envoyee', 'recue'].includes(status) &&
    created > 45
  ) {
    reasons.push(`Sans réponse depuis ${created}min`)
    if (priority !== 'critique') priority = 'critique'
  }

  if (status === 'confirmee' && !request.confirmedAgencyId) {
    reasons.push('Confirmée sans agence — état incohérent')
    if (priority !== 'critique') priority = 'critique'
  }

  // ── ÉLEVÉ ──────────────────────────────────────────────────────────────────

  if (priority !== 'critique') {

    // Extension en attente de réponse (loueur n'a pas encore répondu)
    const pendingExt = (request.extensions ?? []).filter(e => e.status === 'en_attente')
    if (pendingExt.length > 0) {
      reasons.push(`${pendingExt.length} prolongation${pendingExt.length > 1 ? 's' : ''} en attente`)
      priority = 'eleve'
    }

    // Extension urgente (J-1 avant retour, pas encore demandée)
    if (alert === 'extension_urgent') {
      const deadline = getExtensionDeadline(request)
      reasons.push('Dernier jour pour prolonger')
      deadlineLabel = `Retour le ${deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
      priority = 'eleve'
    }

    // Planifiée sans réponse > 4h
    if (
      request.requestType === 'planifiee' &&
      ['envoyee', 'recue'].includes(status) &&
      created > 240
    ) {
      reasons.push('Sans réponse (planifiée)')
      priority = 'eleve'
    }

    // Nouvelles demandes (envoyée / reçue)
    if (['envoyee', 'recue'].includes(status) && reasons.length === 0) {
      reasons.push('Demande en attente de réponse')
      priority = 'eleve'
    }

    // Retour à déclarer (confirmée, date dépassée)
    if (status === 'confirmee') {
      const endDate = getEndDate(request)
      if (new Date() >= endDate) {
        reasons.push('Date de retour atteinte — retour à déclarer')
        const diffDays = Math.floor((Date.now() - endDate.getTime()) / 86_400_000)
        deadlineLabel = diffDays > 0 ? `Retard ${diffDays}j` : 'Retour aujourd\'hui'
        priority = 'eleve'
      }
    }

    // Honorée : paiement en attente
    if (status === 'honoree') {
      reasons.push('Paiement en attente de validation')
      priority = 'eleve'
    }

    // Flags admin
    if ((request.adminFlags ?? []).includes('prioritaire')) {
      reasons.push('Marqué prioritaire')
      priority = 'eleve'
    }
  }

  const isActionable = !['cloturee', 'refusee'].includes(status)

  return { priority, reasons, deadlineLabel, isActionable }
}

// ── Tri opérationnel ──────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<OperationalPriority, number> = {
  critique: 0,
  eleve:    1,
  normal:   2,
}

export function sortByOperationalPriority(requests: AssistanceRequest[]): AssistanceRequest[] {
  return [...requests].sort((a, b) => {
    const pa = computeOperationalFlags(a).priority
    const pb = computeOperationalFlags(b).priority
    const diff = PRIORITY_ORDER[pa] - PRIORITY_ORDER[pb]
    if (diff !== 0) return diff
    // À priorité égale : plus récent en premier
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

// ── Couleurs par priorité ─────────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<OperationalPriority, {
  accent: string; badge: string; border: string; bg: string; dot: string; text: string
}> = {
  critique: {
    accent: 'bg-red-500',
    badge:  'bg-red-100 text-red-700 border-red-200',
    border: 'border-red-200',
    bg:     'bg-red-50/40',
    dot:    'bg-red-500',
    text:   'text-red-700',
  },
  eleve: {
    accent: 'bg-orange-400',
    badge:  'bg-orange-100 text-orange-700 border-orange-200',
    border: 'border-orange-200',
    bg:     'bg-orange-50/30',
    dot:    'bg-orange-400',
    text:   'text-orange-700',
  },
  normal: {
    accent: 'bg-slate-300',
    badge:  'bg-slate-100 text-slate-600 border-slate-200',
    border: 'border-slate-200',
    bg:     'bg-white',
    dot:    'bg-slate-400',
    text:   'text-slate-600',
  },
}
