import { Mail, Phone, Clock, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { AssistanceUser, UserStats } from '@/types/assistanceUser'
import { ASSISTANCE_USER_ROLE_LABELS, ASSISTANCE_USER_ROLE_COLORS } from '@/types/assistanceUser'

interface Props {
  user:    AssistanceUser
  stats:   UserStats
  canEdit: boolean
  onEdit:  (user: AssistanceUser) => void
  onToggleActive: (user: AssistanceUser) => void
}

function formatAvgResponse(ms: number | null): string {
  if (ms === null) return '—'
  const hours = Math.round(ms / 3_600_000)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}j`
}

function initials(user: AssistanceUser) {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
}

function formatLastLogin(iso: string | undefined): string {
  if (!iso) return 'Jamais'
  const d = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3_600_000)
  if (diffH < 1) return 'À l\'instant'
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Hier'
  if (diffD < 7) return `Il y a ${diffD}j`
  return d.toLocaleDateString('fr-FR')
}

export function AssistanceUserCard({ user, stats, canEdit, onEdit, onToggleActive }: Props) {
  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-4 transition-opacity ${!user.active ? 'opacity-60' : ''}`}>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
            user.active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
          }`}>
            {initials(user)}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 text-sm">
                {user.firstName} {user.lastName}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ASSISTANCE_USER_ROLE_COLORS[user.role]}`}>
                {ASSISTANCE_USER_ROLE_LABELS[user.role]}
              </span>
              {!user.active && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Inactif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{user.username}</p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleActive(user)}
              title={user.active ? 'Désactiver' : 'Activer'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {user.active
                ? <ToggleRight className="w-5 h-5 text-green-500" />
                : <ToggleLeft className="w-5 h-5" />
              }
            </button>
            <button
              onClick={() => onEdit(user)}
              title="Modifier"
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Coordonnées */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 transition-colors">
          <Mail className="w-3.5 h-3.5" />
          {user.email}
        </a>
        {user.phone && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Phone className="w-3.5 h-3.5" />
            {user.phone}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100">
        <Stat label="Créées"     value={stats.created}    color="text-slate-700" />
        <Stat label="Confirmées" value={stats.confirmee}  color="text-green-600" />
        <Stat label="Refusées"   value={stats.refusee}    color="text-red-500" />
        <Stat label="Moy. réponse" value={formatAvgResponse(stats.avgResponseMs)} color="text-sky-600" />
      </div>

      {/* Dernière connexion */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        Dernière connexion : {formatLastLogin(user.lastLoginAt)}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-base font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>
    </div>
  )
}
