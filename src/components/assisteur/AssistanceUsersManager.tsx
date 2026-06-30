'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { TeamMember } from '@/types/assistanceUser'
import type { AssistanceRequest } from '@/types/request'
import { getTeamMembers, inviteMember, updateMember, getUserStats } from '@/services/assistanceUserService'
import { getAllRequests } from '@/services/requestService'
import { getSession } from '@/services/currentSessionService'
import { AssistanceUserCard }     from './AssistanceUserCard'
import { AssistanceUserForm }     from './AssistanceUserForm'
import { AssistanceUserActivity } from './AssistanceUserActivity'

export function AssistanceUsersManager() {
  const [members, setMembers]       = useState<TeamMember[]>([])
  const [requests, setRequests]     = useState<AssistanceRequest[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const session  = typeof window !== 'undefined' ? getSession() : null
  const isAdmin  = session?.companyRole === 'admin'

  async function refresh() {
    setMembers(await getTeamMembers())
  }

  useEffect(() => {
    Promise.all([
      getTeamMembers(),
      getAllRequests(),
    ]).then(([m, r]) => {
      setMembers(m)
      setRequests(r)
      setLoading(false)
    })
  }, [])

  async function handleSave(data: { email: string; fullName: string; teamRole: import('@/types/assistanceUser').AssistanceUserRole }) {
    const result = await inviteMember(data)
    if (!result.ok) {
      setError(result.error ?? 'Erreur lors de l\'invitation')
      return
    }
    setError(null)
    setShowForm(false)
    await refresh()
  }

  async function handleToggleActive(member: TeamMember) {
    await updateMember(member.id, { isActive: !member.isActive })
    await refresh()
  }

  async function handleChangeRole(id: string, teamRole: import('@/types/assistanceUser').AssistanceUserRole) {
    await updateMember(id, { teamRole })
    await refresh()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-200 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {members.filter(m => m.isActive).length} actif(s) · {members.length} au total
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(true); setError(null) }}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Inviter
          </button>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {members.map(member => {
          const stats = getUserStats(requests, member.id)
          const memberRequests = requests.filter(r => r.createdByUserId === member.id)
          const isExpanded = expanded === member.id

          return (
            <div key={member.id}>
              <AssistanceUserCard
                member={member}
                stats={stats}
                canEdit={isAdmin}
                onToggleActive={handleToggleActive}
                onChangeRole={handleChangeRole}
              />

              {/* Activité récente */}
              <div className="mt-1">
                <button
                  onClick={() => setExpanded(isExpanded ? null : member.id)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Activité récente ({memberRequests.length} demande{memberRequests.length !== 1 ? 's' : ''})
                </button>

                {isExpanded && (
                  <div className="mt-2 bg-white rounded-2xl border border-slate-100 p-4">
                    <AssistanceUserActivity requests={memberRequests} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal invitation */}
      {showForm && (
        <AssistanceUserForm
          onSave={handleSave}
          onClose={() => { setShowForm(false); setError(null) }}
        />
      )}
    </div>
  )
}
