'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, Package, Wrench } from 'lucide-react'
import { RentalBrandProfile } from '@/components/loueur/RentalBrandProfile'
import { AgencyManager } from '@/components/loueur/AgencyManager'
import { CustomServicesManager } from '@/components/loueur/CustomServicesManager'
import { CategoryManager } from '@/components/loueur/CategoryManager'
import {
  getCurrentBrand,
  getCurrentAgencies,
} from '@/services/loueurService'
import {
  getServicesByAgency,
  getCategoryOffersByAgency,
  createAgency,
  updateAgency,
  deleteAgency,
  createService,
  updateAgencyService,
  deleteService,
  createCategoryOffer,
  updateCategoryOffer,
  deleteCategoryOffer,
} from '@/services/agencyService'
import type { RentalBrand } from '@/types/rentalBrand'
import type { RentalAgency } from '@/types/rentalAgency'
import type { AgencyService } from '@/types/agencyService'
import type { VehicleCategoryOffer } from '@/types/vehicleCategory'
import { CURRENT_BRAND_ID } from '@/data/mockRentalBrands'

interface AgencyData {
  services:   AgencyService[]
  categories: VehicleCategoryOffer[]
}

type Tab = 'services' | 'categories'

export default function LoueurProfilPage() {
  const [brand, setBrand]             = useState<RentalBrand | null>(null)
  const [agencies, setAgencies]       = useState<RentalAgency[]>([])
  const [agencyData, setAgencyData]   = useState<Record<string, AgencyData>>({})
  const [activeId, setActiveId]       = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<Tab>('services')
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const [b, ags] = await Promise.all([getCurrentBrand(), getCurrentAgencies()])
      setBrand(b)
      setAgencies(ags)
      if (ags.length > 0) setActiveId(ags[0].id)

      const data: Record<string, AgencyData> = {}
      await Promise.all(ags.map(async ag => {
        const [services, categories] = await Promise.all([
          getServicesByAgency(ag.id),
          getCategoryOffersByAgency(ag.id),
        ])
        data[ag.id] = { services, categories }
      }))
      setAgencyData(data)
      setLoading(false)
    }
    load()
  }, [])

  // ── Agency CRUD ────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async (data: Omit<RentalAgency, 'id'>) => {
    const agency = await createAgency(data)
    setAgencies(prev => [...prev, agency])
    setAgencyData(prev => ({ ...prev, [agency.id]: { services: [], categories: [] } }))
    setActiveId(agency.id)
    return agency
  }, [])

  const handleUpdate = useCallback(async (id: string, patch: Partial<RentalAgency>) => {
    const updated = await updateAgency(id, patch)
    if (updated) setAgencies(prev => prev.map(a => a.id === id ? updated : a))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteAgency(id)
    setAgencies(prev => prev.filter(a => a.id !== id))
    setAgencyData(prev => { const n = { ...prev }; delete n[id]; return n })
    if (activeId === id) setActiveId(prev => agencies.find(a => a.id !== id)?.id ?? null)
  }, [activeId, agencies])

  // ── Service CRUD ───────────────────────────────────────────────────────────

  const handleCreateService = useCallback(async (data: Omit<AgencyService, 'id'>) => {
    const svc = await createService(data)
    setAgencyData(prev => ({
      ...prev,
      [data.agencyId]: {
        ...prev[data.agencyId],
        services: [...(prev[data.agencyId]?.services ?? []), svc],
      },
    }))
    return svc
  }, [])

  const handleUpdateService = useCallback(async (id: string, patch: Partial<AgencyService>) => {
    const updated = await updateAgencyService(id, patch)
    if (!updated) return
    setAgencyData(prev => ({
      ...prev,
      [updated.agencyId]: {
        ...prev[updated.agencyId],
        services: prev[updated.agencyId].services.map(s => s.id === id ? updated : s),
      },
    }))
  }, [])

  const handleDeleteService = useCallback(async (id: string) => {
    const agencyId = Object.keys(agencyData).find(aid =>
      agencyData[aid]?.services.some(s => s.id === id)
    )
    await deleteService(id)
    if (agencyId) {
      setAgencyData(prev => ({
        ...prev,
        [agencyId]: {
          ...prev[agencyId],
          services: prev[agencyId].services.filter(s => s.id !== id),
        },
      }))
    }
  }, [agencyData])

  // ── Category CRUD ──────────────────────────────────────────────────────────

  const handleCreateCategory = useCallback(async (data: Omit<VehicleCategoryOffer, 'id'>) => {
    const offer = await createCategoryOffer(data)
    setAgencyData(prev => ({
      ...prev,
      [data.agencyId]: {
        ...prev[data.agencyId],
        categories: [...(prev[data.agencyId]?.categories ?? []), offer],
      },
    }))
    return offer
  }, [])

  const handleUpdateCategory = useCallback(async (id: string, patch: Partial<VehicleCategoryOffer>) => {
    const updated = await updateCategoryOffer(id, patch)
    if (!updated) return
    setAgencyData(prev => ({
      ...prev,
      [updated.agencyId]: {
        ...prev[updated.agencyId],
        categories: prev[updated.agencyId].categories.map(c => c.id === id ? updated : c),
      },
    }))
  }, [])

  const handleDeleteCategory = useCallback(async (id: string) => {
    const agencyId = Object.keys(agencyData).find(aid =>
      agencyData[aid]?.categories.some(c => c.id === id)
    )
    await deleteCategoryOffer(id)
    if (agencyId) {
      setAgencyData(prev => ({
        ...prev,
        [agencyId]: {
          ...prev[agencyId],
          categories: prev[agencyId].categories.filter(c => c.id !== id),
        },
      }))
    }
  }, [agencyData])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />)}
      </div>
    )
  }

  const activeAgency = agencies.find(a => a.id === activeId)
  const activeData   = activeId ? agencyData[activeId] : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gérez votre enseigne, vos agences, services et tarifs</p>
      </div>

      {/* ── Enseigne ── */}
      {brand && (
        <section>
          <SectionTitle icon={<Building2 className="w-4 h-4" />} title="Enseigne" />
          <RentalBrandProfile brand={brand} />
        </section>
      )}

      {/* ── Agences ── */}
      <section>
        <SectionTitle icon={<Building2 className="w-4 h-4" />} title="Mes agences" />
        <AgencyManager
          agencies={agencies}
          brandId={CURRENT_BRAND_ID}
          activeAgencyId={activeId}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </section>

      {/* ── Détail agence sélectionnée ── */}
      {activeAgency && activeData && (
        <section>
          <SectionTitle
            icon={<Wrench className="w-4 h-4" />}
            title={activeAgency.name}
            subtitle="Services & catalogue de cette agence"
          />

          {/* Sous-tabs */}
          <div className="flex gap-2 mb-5">
            <TabButton
              active={activeTab === 'services'}
              icon={<Wrench className="w-4 h-4" />}
              label="Services"
              count={activeData.services.length}
              onClick={() => setActiveTab('services')}
            />
            <TabButton
              active={activeTab === 'categories'}
              icon={<Package className="w-4 h-4" />}
              label="Catégories & Tarifs"
              count={activeData.categories.length}
              onClick={() => setActiveTab('categories')}
            />
          </div>

          {activeTab === 'services' && (
            <CustomServicesManager
              agencyId={activeAgency.id}
              services={activeData.services}
              onCreate={handleCreateService}
              onUpdate={handleUpdateService}
              onDelete={handleDeleteService}
            />
          )}

          {activeTab === 'categories' && (
            <CategoryManager
              agencyId={activeAgency.id}
              offers={activeData.categories}
              onCreate={handleCreateCategory}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
            />
          )}
        </section>
      )}
    </div>
  )
}

// ── Helpers UI ─────────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
      <span className="text-slate-400">{icon}</span>
      <div>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function TabButton({ active, icon, label, count, onClick }: {
  active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
        active ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {icon}{label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
      }`}>{count}</span>
    </button>
  )
}
