'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, ShieldCheck, Truck, Copy, Check, ToggleLeft, ToggleRight,
  Building2, Mail, Phone, Clock, Loader2, Eye, EyeOff, UserCircle,
  ChevronDown, ChevronRight, Users,
} from 'lucide-react'
import {
  getAllUsers, createUser, updateUser, generateAccessCode,
} from '@/services/assistanceUserService'
import {
  ASSISTANCE_USER_ROLE_LABELS, ASSISTANCE_USER_ROLE_COLORS,
  type AssistanceUser, type AssistanceUserRole,
} from '@/types/assistanceUser'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { AdminAgency } from '@/app/api/admin/agencies/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function CodeCell({ code }: { code: string }) {
  const [copied, setCopied]   = useState(false)
  const [visible, setVisible] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-1">
      <span className={`font-mono text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 select-all transition-all ${!visible ? 'blur-[3px]' : ''}`}>
        {code}
      </span>
      <button onClick={() => setVisible(v => !v)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
        {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
      <button onClick={copy} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

// ── Groupe assisteur (une société = un accordion) ─────────────────────────────

function AssisteurGroup({
  companyName, users, onToggle, onAdd,
}: {
  companyName: string
  users: AssistanceUser[]
  onToggle: () => void
  onAdd: (companyName: string) => void
}) {
  const [open, setOpen] = useState(true)
  const active = users.filter(u => u.active).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* En-tête société */}
      <div
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 truncate">{companyName}</p>
          <p className="text-xs text-slate-400">
            {users.length} compte{users.length > 1 ? 's' : ''}
            {active < users.length && <span className="text-slate-300"> · {users.length - active} désactivé{users.length - active > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onAdd(companyName) }}
          title="Ajouter un compte"
          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>

      {/* Liste des utilisateurs */}
      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {users.map(user => (
            <div key={user.id} className={`flex items-center gap-3 px-4 py-3 transition-all ${!user.active ? 'opacity-50' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <UserCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{user.firstName} {user.lastName}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ASSISTANCE_USER_ROLE_COLORS[user.role]}`}>
                    {ASSISTANCE_USER_ROLE_LABELS[user.role]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{user.email}</span>
                  {user.phone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{user.phone}</span>}
                  {user.lastLoginAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(user.lastLoginAt), "d MMM 'à' HH'h'mm", { locale: fr })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CodeCell code={user.accessCode} />
                <button onClick={() => { updateUser(user.id, { active: !user.active }); onToggle() }} className="text-slate-300 hover:text-slate-600 transition-colors">
                  {user.active ? <ToggleRight className="w-5 h-5 text-blue-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Carte agence loueur (données Supabase) ────────────────────────────────────

function AgencyCard({ agency }: { agency: AdminAgency }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
        <Truck className="w-4 h-4 text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-slate-900">{agency.agency_name}</span>
          {agency.city && <span className="text-xs text-slate-400">· {agency.city}</span>}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            agency.is_available ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {agency.is_available ? 'Disponible' : 'Indisponible'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 flex-wrap">
          {agency.contact_name && (
            <span className="flex items-center gap-1"><UserCircle className="w-2.5 h-2.5" />{agency.contact_name}</span>
          )}
          {agency.email && (
            <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{agency.email}</span>
          )}
          {agency.phone && (
            <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{agency.phone}</span>
          )}
          {agency.service_radius_km != null && (
            <span className="text-slate-300">· {agency.service_radius_km} km</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal création assisteur ──────────────────────────────────────────────────

const ROLES: AssistanceUserRole[] = ['admin', 'superviseur', 'charge_assistance']

function AssisteurModal({ prefillCompany, onClose, onCreated }: { prefillCompany?: string; onClose: () => void; onCreated: () => void }) {
  const [company, setCompany]     = useState(prefillCompany ?? '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [role, setRole]           = useState<AssistanceUserRole>('charge_assistance')
  const [loading, setLoading]     = useState(false)

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all'
  const valid = company.trim() && firstName.trim() && lastName.trim() && email.trim()

  async function handleCreate() {
    if (!valid) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const username   = `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`.replace(/\s+/g, '')
    const accessCode = generateAccessCode(firstName.trim(), lastName.trim())
    createUser({ companyId: `ac-${Date.now()}`, companyName: company.trim(), firstName: firstName.trim(), lastName: lastName.trim(), username, email: email.trim(), phone: phone.trim() || undefined, role, active: true, accessCode })
    setLoading(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" /> Nouveau compte Assisteur
        </p>

        <div className="bg-blue-50 rounded-xl p-3">
          <label className="text-xs font-bold text-blue-700 flex items-center gap-1.5 mb-1.5">
            <Building2 className="w-3.5 h-3.5" /> Compagnie d'assurance *
          </label>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Ex : Mutualia, AXA, Groupama…"
            className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all font-medium" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Prénom *</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Nom *</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="DUPONT" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Email *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="jean.dupont@compagnie.fr" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Téléphone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="01 23 45 67 89" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Rôle</label>
            <select value={role} onChange={e => setRole(e.target.value as AssistanceUserRole)} className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{ASSISTANCE_USER_ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">Un identifiant et un code d'accès seront générés automatiquement.</p>
        <div className="flex gap-2 pt-1">
          <button onClick={handleCreate} disabled={loading || !valid}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Créer
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

type Tab = 'assisteur' | 'loueur'

export default function AdminUtilisateursPage() {
  const [tab, setTab]               = useState<Tab>('assisteur')
  const [assisteurs, setAssisteurs] = useState<AssistanceUser[]>([])
  const [tick, setTick]             = useState(0)
  const [modal, setModal]           = useState<null | 'assisteur'>(null)
  const [prefillCompany, setPrefillCompany] = useState<string | undefined>()

  // Agences loueur Supabase
  const [agencies,        setAgencies]        = useState<AdminAgency[]>([])
  const [agenciesLoading, setAgenciesLoading] = useState(false)

  useEffect(() => {
    setAssisteurs(getAllUsers())
  }, [tick])

  useEffect(() => {
    setAgenciesLoading(true)
    fetch('/api/admin/agencies')
      .then(r => r.json())
      .then((data: AdminAgency[]) => { setAgencies(data); setAgenciesLoading(false) })
      .catch(() => setAgenciesLoading(false))
  }, [])

  const refresh = () => setTick(t => t + 1)

  // Regrouper les assisteurs par société
  const assisteurGroups = assisteurs.reduce<Record<string, AssistanceUser[]>>((acc, u) => {
    const key = u.companyName ?? 'Mutualia Assurances'
    acc[key] = acc[key] ? [...acc[key], u] : [u]
    return acc
  }, {})

  function openAddAssisteur(company?: string) {
    setPrefillCompany(company)
    setModal('assisteur')
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-10 gap-6">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gérez les accès par société et par agence.
          </p>
        </div>
        <Link
          href="/admin/utilisateurs/nouveau"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Inviter un partenaire
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit">
        <button
          onClick={() => setTab('assisteur')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'assisteur' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Assisteurs
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === 'assisteur' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {Object.keys(assisteurGroups).length}
          </span>
        </button>
        <button
          onClick={() => setTab('loueur')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'loueur' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> Loueurs
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === 'loueur' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {agencies.length}
          </span>
        </button>
      </div>

      {/* Accordions */}
      <div className="space-y-3">
        {tab === 'assisteur' && Object.entries(assisteurGroups).map(([company, users]) => (
          <AssisteurGroup
            key={company}
            companyName={company}
            users={users}
            onToggle={refresh}
            onAdd={openAddAssisteur}
          />
        ))}
        {tab === 'loueur' && agenciesLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        )}
        {tab === 'loueur' && !agenciesLoading && agencies.map(agency => (
          <AgencyCard key={agency.id} agency={agency} />
        ))}
        {tab === 'assisteur' && Object.keys(assisteurGroups).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400">Aucune société assisteur enregistrée</p>
          </div>
        )}
        {tab === 'loueur' && !agenciesLoading && agencies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400">Aucune agence loueur enregistrée</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'assisteur' && (
        <AssisteurModal prefillCompany={prefillCompany} onClose={() => setModal(null)} onCreated={refresh} />
      )}
    </div>
  )
}
