'use client'

import { useCallback, useEffect, useState } from 'react'
import Link                                  from 'next/link'
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react'
import { getAdminFinanceRows, computeFinanceKpis } from '@/services/adminFinanceService'
import type { AdminFinanceRow, AdminFinanceKpis }  from '@/services/adminFinanceService'
import {
  ADMIN_PAYMENT_LABELS,
  ADMIN_PAYMENT_COLORS,
} from '@/types/adminReservation'
import type { AdminPaymentStatus } from '@/types/adminReservation'
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '@/types/request'

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number | null) =>
  n != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
    : '—'

const fmtDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })

// ── Types locaux ───────────────────────────────────────────────────────────────

type TabId = 'tous' | AdminPaymentStatus

const TABS: { id: TabId; label: string }[] = [
  { id: 'tous',           label: 'Tous' },
  { id: 'en_attente',     label: 'En attente' },
  { id: 'pret_a_payer',   label: 'Prêt à payer' },
  { id: 'paye',           label: 'Payé' },
  { id: 'litigieux',      label: 'Litigieux' },
  { id: 'non_applicable', label: 'Non applicable' },
]

type FinanceAction = 'mark_ready' | 'mark_paid' | 'unblock_litige'

interface ModalState {
  row:    AdminFinanceRow
  action: FinanceAction
  error:  string | null
}

// ── KPI card ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub?:  string
  color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Config modales ─────────────────────────────────────────────────────────────

const ACTION_MODAL: Record<FinanceAction, {
  title:        string
  description:  string
  confirmLabel: string
  confirmColor: string
  irreversible: boolean
}> = {
  mark_ready: {
    title:        'Marquer prêt à payer',
    description:  'Ce dossier sera marqué « Prêt à payer ». Vérifiez que les montants sont corrects avant de valider.',
    confirmLabel: 'Valider',
    confirmColor: 'bg-blue-600 hover:bg-blue-700',
    irreversible: false,
  },
  mark_paid: {
    title:        'Confirmer le paiement',
    description:  'Cette action confirme que le loueur a été payé et verrouille définitivement ce dossier en statut « Payé ».',
    confirmLabel: 'Confirmer le paiement',
    confirmColor: 'bg-green-600 hover:bg-green-700',
    irreversible: true,
  },
  unblock_litige: {
    title:        'Débloquer le litige paiement',
    description:  'Le litige paiement sera débloqué. Le dossier repassera en statut « En attente » pour reprise du circuit de paiement. Le statut opérationnel (sinistre) reste inchangé.',
    confirmLabel: 'Débloquer',
    confirmColor: 'bg-amber-600 hover:bg-amber-700',
    irreversible: false,
  },
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminFinancePage() {
  const [rows,    setRows]    = useState<AdminFinanceRow[]>([])
  const [kpis,    setKpis]    = useState<AdminFinanceKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<TabId>('tous')
  const [modal,   setModal]   = useState<ModalState | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getAdminFinanceRows()
    setRows(data)
    setKpis(computeFinanceKpis(data))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered  = tab === 'tous' ? rows : rows.filter(r => r.paymentStatus === tab)
  const tabCount  = (id: TabId) =>
    id === 'tous' ? rows.length : rows.filter(r => r.paymentStatus === id).length

  async function handleConfirm() {
    if (!modal) return
    setSaving(true)
    setModal(m => m ? { ...m, error: null } : null)

    const res = await fetch(`/api/admin/requests/${modal.row.id}/finance`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: modal.action }),
    })

    if (res.ok) {
      setModal(null)
      await load()
    } else {
      const json = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      setModal(m => m ? { ...m, error: json.error ?? `Erreur ${res.status}` } : null)
    }

    setSaving(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Header */}
      <header className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-500" />
            Finance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Suivi des paiements partenaires</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </header>

      {/* KPI bar */}
      {kpis && (
        <div className="px-8 py-5 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-50">
          <KpiCard
            label="CA total HT"
            value={fmt(kpis.totalHt)}
          />
          <KpiCard
            label="Commissions"
            value={fmt(kpis.totalCommission)}
            color="text-violet-700"
          />
          <KpiCard
            label="Dû aux loueurs"
            value={fmt(kpis.totalDueToLoueurs)}
            color="text-blue-700"
          />
          <KpiCard
            label="En attente"
            value={kpis.enAttente}
            sub="dossiers"
            color={kpis.enAttente > 0 ? 'text-amber-700' : 'text-slate-900'}
          />
          <KpiCard
            label="Prêts à payer"
            value={kpis.pretAPayer}
            sub="dossiers"
            color={kpis.pretAPayer > 0 ? 'text-blue-700' : 'text-slate-900'}
          />
          <KpiCard
            label="Litiges paiement"
            value={kpis.litigieux}
            sub="dossiers"
            color={kpis.litigieux > 0 ? 'text-red-600' : 'text-slate-900'}
          />
        </div>
      )}

      {/* Onglets */}
      <div className="px-8 pt-4 pb-0 border-b border-slate-200 bg-white flex gap-1 overflow-x-auto">
        {TABS.map(t => {
          const count  = tabCount(t.id)
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-violet-500 text-violet-700 bg-violet-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tableau */}
      <div className="flex-1 overflow-auto px-8 py-5">
        {loading ? (
          <div className="text-center py-24 text-slate-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400 text-sm">
            Aucun dossier dans cet onglet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs whitespace-nowrap">Dossier</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Partenaire</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Agence</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs whitespace-nowrap">Statut opérationnel</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs whitespace-nowrap">Tarif × Durée</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs whitespace-nowrap">Montant HT</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs">Commission</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs whitespace-nowrap">Dû loueur</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs whitespace-nowrap">Statut paiement</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(row => (
                    <FinanceRow
                      key={row.id}
                      row={row}
                      onAction={(r, a) => setModal({ row: r, action: a, error: null })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmation */}
      {modal && (
        <ConfirmModal
          modal={modal}
          saving={saving}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Ligne du tableau ───────────────────────────────────────────────────────────

function FinanceRow({
  row,
  onAction,
}: {
  row:      AdminFinanceRow
  onAction: (row: AdminFinanceRow, action: FinanceAction) => void
}) {
  const canMarkReady = row.paymentStatus === 'en_attente' && row.totalAmountHt != null
  const canMarkPaid  = row.paymentStatus === 'pret_a_payer'
  const canUnblock   = row.paymentStatus === 'litigieux'
  const needsRecalc  = row.paymentStatus === 'en_attente' && row.totalAmountHt == null

  return (
    <tr className="hover:bg-slate-50 transition-colors">

      {/* Dossier */}
      <td className="px-4 py-3">
        <p className="font-mono font-semibold text-slate-900 text-xs">{row.dossierNumber}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(row.createdAt)}</p>
      </td>

      {/* Partenaire */}
      <td className="px-4 py-3 text-xs text-slate-700 max-w-[140px] truncate">
        {row.partnerName ?? '—'}
      </td>

      {/* Agence */}
      <td className="px-4 py-3 text-xs text-slate-600 max-w-[140px] truncate">
        {row.confirmedAgencyName ?? '—'}
      </td>

      {/* Statut opérationnel — jamais fusionné avec paymentStatus */}
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${REQUEST_STATUS_COLORS[row.status]}`}>
          {REQUEST_STATUS_LABELS[row.status]}
        </span>
      </td>

      {/* Tarif × Durée */}
      <td className="px-4 py-3 text-right text-xs text-slate-600 tabular-nums whitespace-nowrap">
        {row.confirmedPricePerDay != null && row.confirmedDurationDays != null
          ? `${fmt(row.confirmedPricePerDay)} × ${row.confirmedDurationDays}j`
          : '—'}
      </td>

      {/* Montant HT */}
      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900 tabular-nums">
        {fmt(row.totalAmountHt)}
      </td>

      {/* Commission */}
      <td className="px-4 py-3 text-right text-xs text-violet-700 tabular-nums">
        {row.commissionAmount != null
          ? (
            <>
              {fmt(row.commissionAmount)}
              <span className="text-slate-400 ml-1">
                ({Math.round(row.commissionRate * 100)}%)
              </span>
            </>
          )
          : '—'}
      </td>

      {/* Dû loueur */}
      <td className="px-4 py-3 text-right text-xs font-semibold text-blue-700 tabular-nums">
        {fmt(row.amountDueToLoueur)}
      </td>

      {/* Statut paiement */}
      <td className="px-4 py-3 text-center">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${ADMIN_PAYMENT_COLORS[row.paymentStatus]}`}>
          {ADMIN_PAYMENT_LABELS[row.paymentStatus]}
        </span>
        {row.paymentValidatedAt && (
          <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(row.paymentValidatedAt)}</p>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <Link
            href={`/admin/demandes/${row.id}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Ouvrir dossier complet"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {needsRecalc && (
            <Link
              href={`/admin/demandes/${row.id}`}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Recalcul requis depuis le dossier"
            >
              Recalcul requis
            </Link>
          )}

          {canMarkReady && (
            <button
              onClick={() => onAction(row, 'mark_ready')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Valider
            </button>
          )}

          {canMarkPaid && (
            <button
              onClick={() => onAction(row, 'mark_paid')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              Confirmer paiement
            </button>
          )}

          {canUnblock && (
            <button
              onClick={() => onAction(row, 'unblock_litige')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Débloquer
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Modal de confirmation ──────────────────────────────────────────────────────

function ConfirmModal({
  modal,
  saving,
  onConfirm,
  onClose,
}: {
  modal:     ModalState
  saving:    boolean
  onConfirm: () => void
  onClose:   () => void
}) {
  const cfg      = ACTION_MODAL[modal.action]
  const { row }  = modal

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        {/* En-tête */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{cfg.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{row.dossierNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Récapitulatif financier */}
        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs space-y-1.5">
          {row.partnerName && (
            <div className="flex justify-between">
              <span className="text-slate-500">Partenaire</span>
              <span className="font-medium text-slate-800">{row.partnerName}</span>
            </div>
          )}
          {row.confirmedAgencyName && (
            <div className="flex justify-between">
              <span className="text-slate-500">Agence</span>
              <span className="font-medium text-slate-800">{row.confirmedAgencyName}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-slate-200">
            <span className="text-slate-500">Montant HT</span>
            <span className="font-bold text-slate-900">{fmt(row.totalAmountHt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Commission ({Math.round(row.commissionRate * 100)}%)</span>
            <span className="text-violet-700">{fmt(row.commissionAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dû au loueur</span>
            <span className="font-bold text-blue-700">{fmt(row.amountDueToLoueur)}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4">{cfg.description}</p>

        {/* Avertissement irréversible */}
        {cfg.irreversible && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">
              Action irréversible — elle ne peut pas être annulée une fois confirmée.
            </p>
          </div>
        )}

        {/* Erreur API (422 ou autre) */}
        {modal.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-red-700 mb-1">Action refusée</p>
            <p className="text-xs text-red-600">{modal.error}</p>
            <Link
              href={`/admin/demandes/${row.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 mt-2 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Ouvrir le dossier complet
            </Link>
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${cfg.confirmColor}`}
          >
            {saving ? 'En cours…' : cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
