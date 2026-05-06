'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { AssistanceUser } from '@/types/assistanceUser'
import type { AssistanceRequest } from '@/types/request'
import { getAllUsers, createUser, updateUser, getUserStats } from '@/services/assistanceUserService'
import { getAllRequests } from '@/services/requestService'
import { getSession } from '@/services/currentSessionService'
import { AssistanceUserCard }     from './AssistanceUserCard'
import { AssistanceUserForm }     from './AssistanceUserForm'
import { AssistanceUserActivity } from './AssistanceUserActivity'

export function AssistanceUsersManager() {
  const [users, setUsers]         = useState<AssistanceUser[]>([])
  const [requests, setRequests]   = useState<AssistanceRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [editTarget, setEditTarget] = useState<AssistanceUser | 'new' | null>(null)
  const [expanded, setExpanded]   = useState<string | null>(null)

  const session  = typeof window !== 'undefined' ? getSession() : null
  const isAdmin  = session?.companyRole === 'admin'

  useEffect(() => {
    Promise.all([
      Promise.resolve(getAllUsers()),
      getAllRequests(),
    ]).then(([u, r]) => {
      setUsers(u)
      setRequests(r)
      setLoading(false)
    })
  }, [])

  function refresh() {
    setUsers(getAllUsers())
  }

  function handleSave(data: Omit<AssistanceUser, 'id' | 'createdAt' | 'lastLoginAt'>) {
    if (editTarget === 'new') {
      createUser(data)
    } else if (editTarget) {
      updateUser(editTarget.id, data)
    }
    refresh()
    setEditTarget(null)
  }

  function handleToggleActive(user: AssistanceUser) {
    updateUser(user.id, { active: !user.active })
    refresh()
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
            {users.filter(u => u.active).length} actif(s) · {users.length} au total
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditTarget('new')}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {users.map(user => {
          const stats = getUserStats(requests, user.id)
          const userRequests = requests.filter(r => r.createdByUserId === user.id)
          const isExpanded = expanded === user.id

          return (
            <div key={user.id}>
              <AssistanceUserCard
                user={user}
                stats={stats}
                canEdit={isAdmin}
                onEdit={setEditTarget}
                onToggleActive={handleToggleActive}
              />

              {/* Activité récente */}
              <div className="mt-1">
                <button
                  onClick={() => setExpanded(isExpanded ? null : user.id)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Activité récente ({userRequests.length} demande{userRequests.length !== 1 ? 's' : ''})
                </button>

                {isExpanded && (
                  <div className="mt-2 bg-white rounded-2xl border border-slate-100 p-4">
                    <AssistanceUserActivity requests={userRequests} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {editTarget !== null && (
        <AssistanceUserForm
          initial={editTarget === 'new' ? undefined : editTarget}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
