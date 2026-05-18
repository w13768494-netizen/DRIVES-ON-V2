'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Search, Loader2, Users, X, Building2, Mail, Phone,
  ShieldCheck, Truck, Shield, MoreVertical, Check,
  UserX, UserCheck, Trash2, AlertTriangle, Pencil, Wrench,
} from 'lucide-react'
import type { AdminUser, AdminUserRole } from '@/types/adminUser'
import type { AccountType } from '@/types/session'

// ── Constants ──────────────────────────────────────────────────────────────────

type Filter = 'tous' | 'loueur' | 'assistance' | 'insurance_agent' | 'garage' | 'suspendu'

const ROLE_LABELS: Record<AdminUserRole, string> = {
  admin:     'Admin',
  loueur:    'Loueur',
  assisteur: 'Espace Pro',
}

const ROLE_COLORS: Record<AdminUserRole, string> = {
  admin:     'bg-purple-50 text-purple-700 border border-purple-200',
  loueur:    'bg-orange-50 text-orange-700 border border-orange-200',
  assisteur: 'bg-blue-50 text-blue-700 border border-blue-200',
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  assistance:      'Assistance',
  insurance_agent: 'Agent assurance',
  garage:          'Garage',
}

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  assistance:      'bg-blue-50 text-blue-600 border border-blue-200',
  insurance_agent: 'bg-violet-50 text-violet-700 border border-violet-200',
  garage:          'bg-orange-50 text-orange-600 border border-orange-200',
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({
  user, isSelf, onEdit, onRefresh,
}: {
  user:      AdminUser
  isSelf:    boolean
  onEdit:    () => void
  onRefresh: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [acting,   setActing]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  async function toggleActive() {
    setActing(true)
    setMenuOpen(false)
    await fetch(`/api/admin/users/${user.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: user.is_active ? 'suspend' : 'reactivate' }),
    })
    setActing(false)
    onRefresh()
  }

  const roleIcon =
    user.role === 'loueur'    ? <Truck      className="w-4 h-4" /> :
    user.role === 'admin'     ? <Shield     className="w-4 h-4" /> :
                                <ShieldCheck className="w-4 h-4" />
  const roleIconColor =
    user.role === 'loueur'    ? 'text-orange-500' :
    user.role === 'admin'     ? 'text-purple-500' : 'text-blue-500'
  const roleBg =
    user.role === 'loueur'    ? 'bg-orange-50' :
    user.role === 'admin'     ? 'bg-purple-50' : 'bg-blue-50'

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 transition-opacity ${!user.is_active ? 'opacity-60' : ''}`}>

      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${roleBg}`}>
        <span className={roleIconColor}>{roleIcon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{user.full_name}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
          {user.role === 'assisteur' && user.account_type && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ACCOUNT_TYPE_COLORS[user.account_type]}`}>
              {ACCOUNT_TYPE_LABELS[user.account_type]}
            </span>
          )}
          {user.role === 'loueur' && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Building2 className="w-2.5 h-2.5" />
              {user.agency_count} agence{user.agency_count !== 1 ? 's' : ''}
            </span>
          )}
          {isSelf && <span className="text-[10px] text-slate-400">(vous)</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{user.email}</span>
          {user.company_name && <span className="text-slate-300">· {user.company_name}</span>}
          {user.phone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{user.phone}</span>}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-slate-300'}`} />
        <span className={`text-[11px] font-medium ${user.is_active ? 'text-green-600' : 'text-slate-400'}`}>
          {user.is_active ? 'Actif' : 'Suspendu'}
        </span>
      </div>

      <div className="shrink-0 flex items-center gap-1">
        <button
          onClick={onEdit}
          title="Modifier"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {!isSelf && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {acting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <MoreVertical className="w-4 h-4" />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10">
                <button
                  onClick={toggleActive}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                    user.is_active
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {user.is_active
                    ? <><UserX className="w-3.5 h-3.5" /> Suspendre</>
                    : <><UserCheck className="w-3.5 h-3.5" /> Réactiver</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Edit Drawer ────────────────────────────────────────────────────────────────

function EditDrawer({
  user, currentId, onClose, onSaved,
}: {
  user:      AdminUser
  currentId: string
  onClose:   () => void
  onSaved:   () => void
}) {
  const [fullName,       setFullName]       = useState(user.full_name)
  const [companyName,    setCompanyName]    = useState(user.company_name ?? '')
  const [phone,          setPhone]          = useState(user.phone ?? '')
  const [email,          setEmail]          = useState(user.email)
  const [role,           setRole]           = useState<AdminUserRole>(user.role)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [showDelConfirm, setShowDelConfirm] = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  const isSelf       = user.id === currentId
  const emailChanged = email !== user.email

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all'

  async function handleSave() {
    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {}
    if (fullName    !== user.full_name)               body.full_name    = fullName
    if (companyName !== (user.company_name ?? ''))    body.company_name = companyName || null
    if (phone       !== (user.phone ?? ''))           body.phone        = phone || null
    if (email       !== user.email)                   body.email        = email
    if (role        !== user.role && !isSelf)         body.role         = role

    if (Object.keys(body).length === 0) { onClose(); return }

    const res  = await fetch(`/api/admin/users/${user.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la sauvegarde')
      setSaving(false)
      return
    }
    onSaved()
  }

  async function handleSuspend() {
    setSaving(true)
    await fetch(`/api/admin/users/${user.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: user.is_active ? 'suspend' : 'reactivate' }),
    })
    onSaved()
  }

  async function handleDelete() {
    setDeleting(true)
    const res  = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la suppression')
      setShowDelConfirm(false)
      setDeleting(false)
      return
    }
    onSaved()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors ml-2 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Nom complet</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Société</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="—" className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Téléphone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="—" className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} />
            {emailChanged && (
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Un email de confirmation sera envoyé à la nouvelle adresse.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">
              Rôle
              {isSelf && (
                <span className="ml-1.5 text-slate-300 font-normal text-[11px]">
                  (non modifiable — votre compte)
                </span>
              )}
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as AdminUserRole)}
              disabled={isSelf}
              className={`${inputCls} ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="assisteur">Espace Pro</option>
              <option value="loueur">Loueur</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Account actions */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 mb-3">Actions compte</p>

            <button
              onClick={handleSuspend}
              disabled={saving || isSelf}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${
                user.is_active
                  ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                  : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              }`}
            >
              {user.is_active
                ? <><UserX className="w-4 h-4" /> Suspendre</>
                : <><UserCheck className="w-4 h-4" /> Réactiver</>}
            </button>

            {!showDelConfirm ? (
              <button
                onClick={() => setShowDelConfirm(true)}
                disabled={isSelf}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            ) : (
              <div className="border border-red-200 bg-red-50 rounded-xl p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-red-700">Confirmer la suppression ?</p>
                <p className="text-[11px] text-red-500 leading-relaxed">
                  Si des demandes ou agences sont liées, le compte sera anonymisé et suspendu.
                  Sinon, il sera définitivement supprimé.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {deleting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                    Confirmer
                  </button>
                  <button
                    onClick={() => setShowDelConfirm(false)}
                    className="flex-1 py-2 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-white transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminUtilisateursPage() {
  const [users,     setUsers]     = useState<AdminUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<Filter>('tous')
  const [search,    setSearch]    = useState('')
  const [editUser,  setEditUser]  = useState<AdminUser | null>(null)
  const [currentId, setCurrentId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/admin/users').then(r => r.json()).catch(() => [])
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setCurrentId(data.user.id)
    })
  }, [])

  // Filter counts
  const counts: Record<Filter, number> = {
    tous:            users.length,
    loueur:          users.filter(u => u.role === 'loueur').length,
    assistance:      users.filter(u => u.role === 'assisteur' && u.account_type === 'assistance').length,
    insurance_agent: users.filter(u => u.role === 'assisteur' && u.account_type === 'insurance_agent').length,
    garage:          users.filter(u => u.role === 'assisteur' && u.account_type === 'garage').length,
    suspendu:        users.filter(u => !u.is_active).length,
  }

  const filtered = users
    .filter(u => {
      if (filter === 'loueur')          return u.role === 'loueur'
      if (filter === 'assistance')      return u.role === 'assisteur' && u.account_type === 'assistance'
      if (filter === 'insurance_agent') return u.role === 'assisteur' && u.account_type === 'insurance_agent'
      if (filter === 'garage')          return u.role === 'assisteur' && u.account_type === 'garage'
      if (filter === 'suspendu')        return !u.is_active
      return true
    })
    .filter(u => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        u.full_name.toLowerCase().includes(q)           ||
        u.email.toLowerCase().includes(q)               ||
        (u.company_name?.toLowerCase() ?? '').includes(q)
      )
    })

  function handleSaved() {
    load()
    setEditUser(null)
  }

  const FILTER_LABELS: Record<Filter, React.ReactNode> = {
    tous:            'Tous',
    loueur:          <><Truck       className="w-3 h-3" /> Loueurs</>,
    assistance:      <><ShieldCheck className="w-3 h-3" /> Assistance</>,
    insurance_agent: <><Building2   className="w-3 h-3" /> Agents assurance</>,
    garage:          <><Wrench      className="w-3 h-3" /> Garages</>,
    suspendu:        <><UserX       className="w-3 h-3" /> Suspendus</>,
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-10 gap-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gérez les comptes et les accès.</p>
        </div>
        <Link
          href="/admin/utilisateurs/nouveau"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Inviter un partenaire
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit flex-wrap">
        {(['tous', 'loueur', 'assistance', 'insurance_agent', 'garage', 'suspendu'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {FILTER_LABELS[f]}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              filter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, société…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Users className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.id === currentId}
              onEdit={() => setEditUser(user)}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {/* Edit drawer */}
      {editUser && (
        <EditDrawer
          user={editUser}
          currentId={currentId}
          onClose={() => setEditUser(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
