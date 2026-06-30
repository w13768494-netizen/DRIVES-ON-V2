'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { AssistanceUserRole } from '@/types/assistanceUser'
import { ASSISTANCE_USER_ROLE_LABELS } from '@/types/assistanceUser'

interface InviteData {
  email:    string
  fullName: string
  teamRole: AssistanceUserRole
}

interface Props {
  onSave:  (data: InviteData) => void
  onClose: () => void
}

const ROLES: AssistanceUserRole[] = ['admin', 'superviseur', 'charge_assistance']

export function AssistanceUserForm({ onSave, onClose }: Props) {
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [teamRole, setTeamRole] = useState<AssistanceUserRole>('charge_assistance')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) return
    onSave({
      fullName: fullName.trim(),
      email:    email.trim().toLowerCase(),
      teamRole,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Inviter un membre</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Nom complet */}
          <Field label="Nom complet" required>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className={inputCls}
              placeholder="Marie Leconte"
              required
            />
          </Field>

          {/* Email */}
          <Field label="Email" required>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls}
              placeholder="marie.leconte@mutualia.fr"
              required
            />
          </Field>

          {/* Rôle */}
          <Field label="Rôle" required>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTeamRole(r)}
                  className={[
                    'flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all',
                    teamRole === r
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300',
                  ].join(' ')}
                >
                  {ASSISTANCE_USER_ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </Field>

          <p className="text-xs text-slate-400">
            Un email d&apos;invitation sera envoyé à ce membre pour qu&apos;il rejoigne l&apos;organisation.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              Envoyer l&apos;invitation
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
