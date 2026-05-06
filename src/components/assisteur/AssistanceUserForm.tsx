'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { AssistanceUser, AssistanceUserRole } from '@/types/assistanceUser'
import { ASSISTANCE_USER_ROLE_LABELS } from '@/types/assistanceUser'
import { generateAccessCode } from '@/services/assistanceUserService'

interface Props {
  initial?: AssistanceUser
  onSave:  (data: Omit<AssistanceUser, 'id' | 'createdAt' | 'lastLoginAt'>) => void
  onClose: () => void
}

const ROLES: AssistanceUserRole[] = ['admin', 'superviseur', 'charge_assistance']

export function AssistanceUserForm({ initial, onSave, onClose }: Props) {
  const isNew = !initial

  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName,  setLastName]  = useState(initial?.lastName  ?? '')
  const [username,  setUsername]  = useState(initial?.username  ?? '')
  const [email,     setEmail]     = useState(initial?.email     ?? '')
  const [phone,     setPhone]     = useState(initial?.phone     ?? '')
  const [role,      setRole]      = useState<AssistanceUserRole>(initial?.role ?? 'charge_assistance')
  const [active,    setActive]    = useState(initial?.active    ?? true)
  const [accessCode, setAccessCode] = useState(
    initial?.accessCode ?? generateAccessCode(firstName || 'XX', lastName || 'XX')
  )
  const [copied, setCopied] = useState(false)

  function handleGenerateCode() {
    if (firstName && lastName) {
      setAccessCode(generateAccessCode(firstName, lastName))
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(accessCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName || !lastName || !username || !email || !accessCode) return
    onSave({
      companyId:  'ac-001',
      firstName:  firstName.trim(),
      lastName:   lastName.trim(),
      username:   username.trim().toLowerCase(),
      email:      email.trim().toLowerCase(),
      phone:      phone.trim() || undefined,
      role,
      active,
      accessCode: accessCode.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">
            {isNew ? 'Ajouter un utilisateur' : 'Modifier l\'utilisateur'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Nom + Prénom */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" required>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={inputCls}
                placeholder="Marie"
                required
              />
            </Field>
            <Field label="Nom" required>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={inputCls}
                placeholder="LECONTE"
                required
              />
            </Field>
          </div>

          {/* Identifiant */}
          <Field label="Identifiant de connexion" required>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '.'))}
              className={`${inputCls} font-mono`}
              placeholder="marie.leconte"
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

          {/* Téléphone */}
          <Field label="Téléphone (optionnel)">
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={inputCls}
              placeholder="01 40 20 30 XX"
            />
          </Field>

          {/* Rôle */}
          <Field label="Rôle" required>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={[
                    'flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all',
                    role === r
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300',
                  ].join(' ')}
                >
                  {ASSISTANCE_USER_ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </Field>

          {/* Code d'accès */}
          <Field label="Code d'accès">
            <div className="flex gap-2">
              <input
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                className={`${inputCls} flex-1 font-mono tracking-widest`}
                placeholder="CODE-XXXX"
                required
              />
              {isNew && (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Générer
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 transition-colors"
                title="Copier le code"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {isNew && (
              <p className="text-xs text-slate-400 mt-1">
                Communiquez ce code à l'utilisateur — il ne sera plus affiché ensuite.
              </p>
            )}
          </Field>

          {/* Actif */}
          {!isNew && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setActive(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${active ? 'bg-green-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm text-slate-700">Compte actif</span>
            </label>
          )}

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
              {isNew ? 'Créer l\'utilisateur' : 'Enregistrer'}
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
