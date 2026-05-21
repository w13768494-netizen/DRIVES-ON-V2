'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  PlusCircle, Send, Eye, CheckCircle2, XCircle,
  ArrowRightLeft, CheckCheck, ThumbsDown, ArrowRight,
  Star, Archive, Lock, Users, Tag, CalendarPlus, CalendarCheck, BadgeCheck,
  RefreshCw, Bell, Banknote, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { TIMELINE_EVENT_LABELS } from '@/types/requestTimeline'
import type { RequestTimelineEvent, TimelineEventType } from '@/types/requestTimeline'

const TIMELINE_ICONS: Record<TimelineEventType, React.ReactNode> = {
  creation:           <PlusCircle     className="w-4 h-4" />,
  envoi:              <Send           className="w-4 h-4" />,
  reception:          <Eye            className="w-4 h-4" />,
  acceptation:        <CheckCircle2   className="w-4 h-4" />,
  refus:              <XCircle        className="w-4 h-4" />,
  transfert_propose:  <ArrowRightLeft className="w-4 h-4" />,
  transfert_valide:   <CheckCheck     className="w-4 h-4" />,
  transfert_refuse:   <ThumbsDown     className="w-4 h-4" />,
  transfert:          <ArrowRight     className="w-4 h-4" />,
  confirmation:       <Star           className="w-4 h-4" />,
  negociation:        <Tag            className="w-4 h-4" />,
  attribution:        <Lock           className="w-4 h-4" />,
  attribution_fermee: <Users          className="w-4 h-4" />,
  honore:                 <CheckCheck     className="w-4 h-4" />,
  cloture:               <Archive        className="w-4 h-4" />,
  prolongation_demandee: <CalendarPlus   className="w-4 h-4" />,
  prolongation_reponse:  <CalendarPlus   className="w-4 h-4" />,
  retour_confirme:           <CalendarCheck  className="w-4 h-4" />,
  paiement_valide:           <BadgeCheck     className="w-4 h-4" />,
  sinistre_declare:          <XCircle        className="w-4 h-4" />,
  overdue_detecte:           <AlertTriangle  className="w-4 h-4" />,
  litige_resolu:             <ShieldCheck    className="w-4 h-4" />,
  admin_changement_statut:   <RefreshCw      className="w-4 h-4" />,
  admin_relance:             <Bell           className="w-4 h-4" />,
  admin_finance:             <Banknote       className="w-4 h-4" />,
  partenaire_relance:        <Bell           className="w-4 h-4" />,
  document_valide:           <CheckCircle2   className="w-4 h-4" />,
  document_refuse:           <XCircle        className="w-4 h-4" />,
}

const TIMELINE_COLORS: Record<TimelineEventType, string> = {
  creation:           'bg-slate-100   text-slate-500   border-slate-200',
  envoi:              'bg-amber-100   text-amber-600   border-amber-200',
  reception:          'bg-sky-100     text-sky-600     border-sky-200',
  acceptation:        'bg-teal-100    text-teal-600    border-teal-200',
  refus:              'bg-red-100     text-red-600     border-red-200',
  transfert_propose:  'bg-orange-100  text-orange-600  border-orange-200',
  transfert_valide:   'bg-orange-100  text-orange-600  border-orange-200',
  transfert_refuse:   'bg-red-100     text-red-600     border-red-200',
  transfert:          'bg-blue-100    text-blue-600    border-blue-200',
  confirmation:       'bg-teal-100    text-teal-600    border-teal-200',
  negociation:        'bg-purple-100  text-purple-600  border-purple-200',
  attribution:        'bg-green-100   text-green-700   border-green-200',
  attribution_fermee: 'bg-slate-100   text-slate-500   border-slate-200',
  honore:                 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cloture:               'bg-slate-100   text-slate-500  border-slate-200',
  prolongation_demandee: 'bg-orange-100  text-orange-600 border-orange-200',
  prolongation_reponse:  'bg-orange-100  text-orange-600 border-orange-200',
  retour_confirme:           'bg-blue-100    text-blue-600   border-blue-200',
  paiement_valide:           'bg-green-100   text-green-700  border-green-200',
  sinistre_declare:          'bg-red-100     text-red-600    border-red-200',
  overdue_detecte:           'bg-red-600     text-white      border-red-700',
  litige_resolu:             'bg-emerald-100 text-emerald-700 border-emerald-200',
  admin_changement_statut:   'bg-violet-100  text-violet-600 border-violet-200',
  admin_relance:             'bg-violet-100  text-violet-600 border-violet-200',
  admin_finance:             'bg-emerald-100 text-emerald-600 border-emerald-200',
  partenaire_relance:        'bg-amber-100   text-amber-600  border-amber-200',
  document_valide:           'bg-green-100   text-green-600  border-green-200',
  document_refuse:           'bg-red-100     text-red-600    border-red-200',
}

interface Props {
  events: RequestTimelineEvent[]
}

export function RequestTimeline({ events }: Props) {
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime())

  if (sorted.length === 0) return null

  return (
    <div className="relative flex flex-col gap-0">
      {sorted.map((evt, i) => {
        const isLast   = i === sorted.length - 1
        const colorCls = TIMELINE_COLORS[evt.type]

        return (
          <div key={evt.id} className="flex items-start gap-3">
            {/* Ligne verticale + icône */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${colorCls}`}>
                {TIMELINE_ICONS[evt.type]}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-slate-200 min-h-[20px]" />}
            </div>

            {/* Contenu */}
            <div className="pb-4 min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {evt.type === 'attribution' && evt.message
                  ? `Demande attribuée à ${evt.message}`
                  : evt.type === 'confirmation' && evt.message
                  ? `Prix proposé par le loueur : ${evt.message} €/j`
                  : evt.type === 'negociation' && evt.message
                  ? `Contre-offre proposée : ${evt.message} €/j`
                  : evt.type === 'prolongation_demandee' && evt.message
                  ? `Prolongation demandée : +${evt.message} jour${Number(evt.message) > 1 ? 's' : ''}`
                  : evt.type === 'retour_confirme' && evt.message
                  ? `Retour confirmé — ${format(new Date(evt.message), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}`
                  : TIMELINE_EVENT_LABELS[evt.type]
                }
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-xs text-slate-400">
                  {format(evt.at, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                </span>
                <span className="text-xs text-slate-300">·</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  evt.byRole === 'assisteur' ? 'bg-brand-50 text-brand-600'
                  : evt.byRole === 'loueur'  ? 'bg-slate-100 text-slate-600'
                  :                            'bg-slate-50  text-slate-400'
                }`}>
                  {evt.byRole === 'assisteur' ? 'Assisteur'
                   : evt.byRole === 'loueur'  ? 'Loueur'
                   : evt.byRole === 'admin'   ? 'Équipe DRIVES ON'
                   :                           'Système'}
                </span>
              </div>
              {evt.message && !['attribution', 'confirmation', 'negociation', 'retour_confirme'].includes(evt.type) && (
                <p className="text-xs text-slate-500 mt-1 italic">"{evt.message}"</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
