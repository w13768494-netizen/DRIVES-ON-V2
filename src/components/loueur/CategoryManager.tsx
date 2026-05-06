'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Loader2, Check, X } from 'lucide-react'
import { PricingPackageEditor } from './PricingPackageEditor'
import {
  VEHICLE_CATEGORY_LABELS, VEHICLE_GROUP_LABELS, TOURISME_CATEGORIES, UTILITAIRE_CATEGORIES,
  VEHICLE_CATEGORY_GROUPS, getCategoriesForGroup,
  type VehicleCategoryType, type VehicleGroupType, type VehicleCategoryOffer, type PricingPackage,
} from '@/types/vehicleCategory'

// ── Formulaire inline pour une catégorie ──────────────────────────────────────

interface CategoryFormValues {
  category:         VehicleCategoryType
  available:        boolean
  stockEstimate:    number
  dailyRate:        number
  packages:         PricingPackage[]
  deposit:          number
  includedKmPerDay: number
  extraKmPrice:     number
}

const fi = 'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400'
const lb = 'text-xs text-slate-500 mb-0.5 block'

function CategoryForm({
  initial,
  group,
  agencyId,
  usedCategories,
  onSave,
  onCancel,
}: {
  initial?:       VehicleCategoryOffer
  group:          VehicleGroupType
  agencyId:       string
  usedCategories: VehicleCategoryType[]
  onSave:         (data: Omit<VehicleCategoryOffer, 'id'>) => Promise<void>
  onCancel:       () => void
}) {
  const availableCategories = getCategoriesForGroup(group).filter(
    c => c === initial?.category || !usedCategories.includes(c)
  )

  const [form, setForm] = useState<CategoryFormValues>({
    category:         initial?.category ?? availableCategories[0],
    available:        initial?.available ?? true,
    stockEstimate:    initial?.stockEstimate ?? 1,
    dailyRate:        initial?.dailyRate ?? 0,
    packages:         initial?.packages ?? [],
    deposit:          initial?.deposit ?? 0,
    includedKmPerDay: initial?.includedKmPerDay ?? 200,
    extraKmPrice:     initial?.extraKmPrice ?? 0,
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ ...form, agencyId, group })
    setSaving(false)
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={lb}>Catégorie</label>
          <select value={form.category} onChange={e => set('category', e.target.value as VehicleCategoryType)} className={fi}>
            {availableCategories.map(c => (
              <option key={c} value={c}>{VEHICLE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lb}>Tarif/jour (€)</label>
          <input type="number" value={form.dailyRate} onChange={e => set('dailyRate', Number(e.target.value))} className={fi} />
        </div>
        <div>
          <label className={lb}>Caution (€)</label>
          <input type="number" value={form.deposit} onChange={e => set('deposit', Number(e.target.value))} className={fi} />
        </div>
        <div>
          <label className={lb}>Stock estimé</label>
          <input type="number" value={form.stockEstimate} onChange={e => set('stockEstimate', Number(e.target.value))} className={fi} />
        </div>
        <div>
          <label className={lb}>Km inclus/j</label>
          <input type="number" value={form.includedKmPerDay} onChange={e => set('includedKmPerDay', Number(e.target.value))} className={fi} />
        </div>
        <div>
          <label className={lb}>€/km suppl.</label>
          <input type="number" step="0.01" value={form.extraKmPrice} onChange={e => set('extraKmPrice', Number(e.target.value))} className={fi} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.available} onChange={e => set('available', e.target.checked)}
              className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-slate-700">Disponible</span>
          </label>
        </div>
      </div>

      <PricingPackageEditor packages={form.packages} onChange={pkgs => set('packages', pkgs)} />

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {initial ? 'Enregistrer' : 'Ajouter'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-xl transition-colors">
          <X className="w-4 h-4" />Annuler
        </button>
      </div>
    </div>
  )
}

// ── Ligne d'une catégorie existante ───────────────────────────────────────────

function CategoryRow({
  offer,
  usedCategories,
  group,
  agencyId,
  onUpdate,
  onDelete,
}: {
  offer:          VehicleCategoryOffer
  usedCategories: VehicleCategoryType[]
  group:          VehicleGroupType
  agencyId:       string
  onUpdate:       (id: string, patch: Omit<VehicleCategoryOffer, 'id'>) => Promise<void>
  onDelete:       (id: string) => Promise<void>
}) {
  const [editing, setEditing]     = useState(false)
  const [confirming, setConfirm]  = useState(false)
  const [deleting, setDeleting]   = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await onDelete(offer.id)
    setDeleting(false)
  }

  if (editing) {
    return (
      <CategoryForm
        initial={offer}
        group={group}
        agencyId={agencyId}
        usedCategories={usedCategories}
        onSave={async (data) => { await onUpdate(offer.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className={`flex flex-col gap-2 bg-white rounded-2xl border px-4 py-3 transition-all ${
      offer.available ? 'border-slate-200' : 'border-slate-100 opacity-70'
    }`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-semibold ${offer.available ? 'text-slate-900' : 'text-slate-400'}`}>
            {VEHICLE_CATEGORY_LABELS[offer.category]}
          </span>
          {offer.available
            ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Dispo</span>
            : <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Indisponible</span>
          }
        </div>
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          {confirming ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Supprimer
              </button>
              <button onClick={() => setConfirm(false)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 border border-slate-200 rounded-lg">
                Annuler
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-slate-500">
        <span><strong className="text-slate-700">{offer.dailyRate} €/j</strong></span>
        <span>Caution : {offer.deposit} €</span>
        <span>{offer.includedKmPerDay} km/j</span>
        {offer.extraKmPrice > 0 && <span>{offer.extraKmPrice} €/km suppl.</span>}
        <span>Stock : {offer.stockEstimate}</span>
        {offer.packages.map(p => <span key={p.label}>{p.label} : {p.price} €</span>)}
      </div>
    </div>
  )
}

// ── Manager principal ─────────────────────────────────────────────────────────

interface ManagerProps {
  agencyId: string
  offers:   VehicleCategoryOffer[]
  onCreate: (data: Omit<VehicleCategoryOffer, 'id'>) => Promise<VehicleCategoryOffer>
  onUpdate: (id: string, patch: Partial<VehicleCategoryOffer>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function CategoryManager({ agencyId, offers, onCreate, onUpdate, onDelete }: ManagerProps) {
  const [activeGroup, setActiveGroup] = useState<VehicleGroupType>('tourisme')
  const [adding, setAdding]           = useState(false)

  const groupOffers = offers.filter(o => o.group === activeGroup)
  const usedCategories = offers.map(o => o.category)

  const availableToAdd = getCategoriesForGroup(activeGroup).filter(c => !usedCategories.includes(c))

  async function handleCreate(data: Omit<VehicleCategoryOffer, 'id'>) {
    await onCreate(data)
    setAdding(false)
  }

  async function handleUpdate(id: string, data: Omit<VehicleCategoryOffer, 'id'>) {
    await onUpdate(id, data as Partial<VehicleCategoryOffer>)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs groupe */}
      <div className="flex gap-2">
        {(['tourisme', 'utilitaire'] as VehicleGroupType[]).map(g => {
          const count = offers.filter(o => o.group === g).length
          return (
            <button
              key={g}
              onClick={() => { setActiveGroup(g); setAdding(false) }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeGroup === g
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {VEHICLE_GROUP_LABELS[g]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeGroup === g ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-3">
        {groupOffers.length === 0 && !adding && (
          <p className="text-sm text-slate-400 italic text-center py-4">
            Aucune catégorie {VEHICLE_GROUP_LABELS[activeGroup].toLowerCase()} configurée.
          </p>
        )}
        {groupOffers.map(offer => (
          <CategoryRow
            key={offer.id}
            offer={offer}
            usedCategories={usedCategories}
            group={activeGroup}
            agencyId={agencyId}
            onUpdate={handleUpdate}
            onDelete={onDelete}
          />
        ))}

        {/* Formulaire d'ajout */}
        {adding && availableToAdd.length > 0 && (
          <CategoryForm
            group={activeGroup}
            agencyId={agencyId}
            usedCategories={usedCategories}
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      {/* Bouton ajouter */}
      {!adding && availableToAdd.length > 0 && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-xl px-4 py-2.5 transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Ajouter une catégorie {VEHICLE_GROUP_LABELS[activeGroup].toLowerCase()}
        </button>
      )}
      {!adding && availableToAdd.length === 0 && groupOffers.length > 0 && (
        <p className="text-xs text-slate-400 italic">Toutes les catégories {VEHICLE_GROUP_LABELS[activeGroup].toLowerCase()} sont déjà configurées.</p>
      )}
    </div>
  )
}
