import { Mail, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { TeamMember, UserStats, AssistanceUserRole } from '@/types/assistanceUser'
import { ASSISTANCE_USER_ROLE_LABELS, ASSISTANCE_USER_ROLE_COLORS } from '@/types/assistanceUser'

interface Props {
  member:         TeamMember
  stats:          UserStats
  canEdit:        boolean
  onToggleActive: (member: TeamMember) => void
  onChangeRole:   (id: string, teamRole: AssistanceUserRole) => void
}

function formatAvgResponse(ms: number | null): string {
  if (ms === null) return '—'
  const hours = Math.round(ms / 3_600_000)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}j`
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return fullName.slice(0, 2).toUpperCase()
}

export function AssistanceUserCard({ member, stats, canEdit, onToggleActive, onChangeRole }: Props) {
  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-4 transition-opacity ${!member.isActive ? 'opacity-60' : ''}`}>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
            member.isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
          }`}>
            {initials(member.fullName)}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 text-sm">
                {member.fullName}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ASSISTANCE_USER_ROLE_COLORS[member.teamRole]}`}>
                {ASSISTANCE_USER_ROLE_LABELS[member.teamRole]}
              </span>
              {!member.isActive && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Inactif
                </span>
              )}
            </div>
            <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 transition-colors mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {member.email}
            </a>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleActive(member)}
              title={member.isActive ? 'Désactiver' : 'Activer'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {member.isActive
                ? <ToggleRight className="w-5 h-5 text-green-500" />
                : <ToggleLeft className="w-5 h-5" />
              }
            </button>
            {/* Changement de rôle inline */}
            <select
              value={member.teamRole}
              onChange={e => onChangeRole(member.id, e.target.value as AssistanceUserRole)}
              title="Changer le rôle"
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-500 hover:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white cursor-pointer"
            >
              <option value="admin">Administrateur</option>
              <option value="superviseur">Superviseur</option>
              <option value="charge_assistance">Chargé d&apos;assistance</option>
            </select>
            <Edit2 className="w-4 h-4 text-slate-300 shrink-0" />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100">
        <Stat label="Créées"     value={stats.created}    color="text-slate-700" />
        <Stat label="Confirmées" value={stats.confirmee}  color="text-green-600" />
        <Stat label="Refusées"   value={stats.refusee}    color="text-red-500" />
        <Stat label="Moy. réponse" value={formatAvgResponse(stats.avgResponseMs)} color="text-sky-600" />
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
