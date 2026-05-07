'use client'

import { useEffect, useState } from 'react'
import { Search, Building2 }  from 'lucide-react'
import { RentalStats }         from '@/components/loueur/RentalStats'
import { RentalRequestCard }   from '@/components/loueur/RentalRequestCard'
import { getMyAgencies, type RentalAgencyRow } from '@/services/rentalAgencyService'
import { getReceivedRequests }  from '@/services/loueurService'
import { getSession }           from '@/services/currentSessionService'
import type { ReceivedRequest }  from '@/types/loueur'
import type { MockSession }      from '@/types/session'
import { getDisplayStatus, type DisplayStatusType } from '@/lib/displayStatus'

type FilterTab = 'toutes' | DisplayStatusType

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'toutes',              label: 'Toutes'     },
  { key: 'en_attente',          label: 'En attente' },
  { key: 'confirmee',           label: 'Confirmée'  },
  { key: 'en_cours',            label: 'En cours'   },
  { key: 'en_attente_paiement', label: 'Paiement'   },
  { key: 'cloturee',            label: 'Clôturé'    },
]

function matchesTab(r: ReceivedRequest, tab: FilterTab): boolean {
  if (tab === 'toutes') return true
  return getDisplayStatus(r.status, r.dateNeeded) === tab
}

export default function LoueurDashboardPage() {
  const [requests, setRequests] = useState<ReceivedRequest[]>([])
  const [agencies, setAgencies] = useState<RentalAgencyRow[] | null>(null)
  const [session,  setSessionState] = useState<MockSession | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [tab,      setTab]      = useState<FilterTab>('toutes')

  useEffect(() => {
    setSessionState(getSession())

    getMyAgencies().then(async myAgencies => {
      setAgencies(myAgencies)
      const received = await getReceivedRequests(myAgencies)
      setRequests(received)
      setLoading(false)
    })
  }, [])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const header = (
    <div>
      <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1 capitalize">{today}</p>
      <h1 className="text-2xl font-black text-slate-900">
        {session ? `Bonjour, ${session.userName.split(' ')[0]}` : 'Tableau de bord'}
      </h1>
      <p className="text-sm text-slate-500 mt-0.5">
        {session?.company ?? 'Demandes reçues par vos agences'}
      </p>
    </div>
  )

  // Chargement initial
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <StatsSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  // Aucune agence rattachée — état de configuration
  if (agencies !== null && agencies.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col items-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-brand-400" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Votre espace loueur est en cours de configuration</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Aucune agence n'est encore rattachée à votre compte.
              L'équipe Drives On configurera votre espace prochainement.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard avec agences
  const filtered = requests.filter(r => {
    if (!matchesTab(r, tab)) return false
    const q = search.toLowerCase()
    return !q
      || r.dossierNumber.toLowerCase().includes(q)
      || r.sinistre.lastName.toLowerCase().includes(q)
      || r.sinistre.firstName.toLowerCase().includes(q)
      || r.location.address.toLowerCase().includes(q)
  })

  const tabCount = (key: FilterTab) =>
    key === 'toutes' ? requests.length : requests.filter(r => matchesTab(r, key)).length

  return (
    <div className="flex flex-col gap-6">

      {header}

      <RentalStats requests={requests} />

      {/* Recherche + Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            aria-label="Rechercher une demande"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Dossier, sinistré, adresse…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
          />
        </div>

        <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200">
          {TABS.map(t => {
            const count  = tabCount(t.key)
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap',
                  active
                    ? 'border-brand-500 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
                ].join(' ')}
              >
                {t.label}
                <span className={[
                  'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center tabular-nums',
                  active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
                ].join(' ')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState search={search} onClear={() => setSearch('')} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(r => <RentalRequestCard key={r.id} request={r} />)}
        </div>
      )}
    </div>
  )
}

// ── Skeletons & états vides ────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 shadow-sm animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-slate-100" />
          <div className="space-y-2">
            <div className="h-8 w-10 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
          <div className="w-1 bg-slate-200 shrink-0" />
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 bg-slate-200 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="flex gap-4">
              <div className="h-3 w-28 bg-slate-100 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Search className="w-7 h-7 text-slate-400" aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-slate-700">Aucune demande reçue pour le moment</p>
        <p className="text-sm text-slate-400 mt-1">
          {search ? 'Aucun résultat pour cette recherche.' : 'Les demandes assignées à vos agences apparaîtront ici.'}
        </p>
      </div>
      {search && (
        <button
          onClick={onClear}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
        >
          Effacer la recherche
        </button>
      )}
    </div>
  )
}
