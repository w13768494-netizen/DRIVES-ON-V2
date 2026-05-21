'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, CheckCheck, Loader2, Bell,
  AlertTriangle, FileWarning, CheckCircle2, XCircle,
  Zap, CalendarPlus, Car, FileText,
  ArrowRightLeft, CreditCard, RefreshCw,
} from 'lucide-react'
import { getNotifications, markAsRead, markAllAsRead } from '@/services/notificationService'
import { relativeTime } from '@/lib/operationalPriority'
import type { PlatformNotification } from '@/services/notificationService'

// ── Styles par type ───────────────────────────────────────────────────────────

interface NotifStyle {
  icon:    React.ReactNode
  iconBg:  string
  cardBg:  string
  dot:     string
}

function getStyle(type: string, unread: boolean): NotifStyle {
  const critical = ['overdue', 'damage_claim'].includes(type)

  function s(icon: React.ReactNode, iconBg: string): NotifStyle {
    return {
      icon,
      iconBg,
      cardBg: unread
        ? critical ? 'bg-red-50 border-red-100' : 'bg-brand-50 border-brand-100'
        : 'bg-white border-slate-100',
      dot: critical ? 'bg-red-500' : 'bg-brand-500',
    }
  }

  const c = (col: string) => `w-4 h-4 ${unread ? col : 'text-slate-400'}`

  if (type === 'overdue')               return s(<AlertTriangle   className={c('text-red-600')} />,     unread ? 'bg-red-100'     : 'bg-slate-100')
  if (type === 'damage_claim')          return s(<FileWarning      className={c('text-orange-600')} />,  unread ? 'bg-orange-100'  : 'bg-slate-100')
  if (type === 'new_request')           return s(<Zap              className={c('text-brand-600')} />,   unread ? 'bg-brand-100'   : 'bg-slate-100')
  if (type === 'loueur_accepte')        return s(<CheckCircle2     className={c('text-emerald-600')} />, unread ? 'bg-emerald-100' : 'bg-slate-100')
  if (type === 'loueur_refuse')         return s(<XCircle          className={c('text-red-500')} />,     unread ? 'bg-red-50'      : 'bg-slate-100')
  if (type === 'loueur_contre_propose') return s(<ArrowRightLeft   className={c('text-amber-600')} />,   unread ? 'bg-amber-100'   : 'bg-slate-100')
  if (type === 'retour_confirme')       return s(<Car              className={c('text-blue-600')} />,    unread ? 'bg-blue-100'    : 'bg-slate-100')
  if (type === 'loueur_document_ajoute')return s(<FileText         className={c('text-brand-600')} />,   unread ? 'bg-brand-100'   : 'bg-slate-100')
  if (type === 'extension_demandee')    return s(<CalendarPlus     className={c('text-amber-600')} />,   unread ? 'bg-amber-100'   : 'bg-slate-100')
  if (type === 'prolongation_reponse')  return s(<CalendarPlus     className={c('text-amber-600')} />,   unread ? 'bg-amber-100'   : 'bg-slate-100')
  if (type === 'admin_finance')         return s(<CreditCard       className={c('text-violet-600')} />,  unread ? 'bg-violet-100'  : 'bg-slate-100')
  if (type === 'admin_changement_statut') return s(<RefreshCw      className={c('text-violet-600')} />,  unread ? 'bg-violet-100'  : 'bg-slate-100')
  if (type === 'document_valide')       return s(<CheckCircle2     className={c('text-green-600')} />,   unread ? 'bg-green-100'   : 'bg-slate-100')
  if (type === 'document_refuse')       return s(<XCircle          className={c('text-red-600')} />,     unread ? 'bg-red-100'     : 'bg-slate-100')
  if (type === 'admin_relance')         return s(<Bell             className={c('text-violet-600')} />,  unread ? 'bg-violet-100'  : 'bg-slate-100')
  if (type === 'partenaire_relance')    return s(<Bell             className={c('text-amber-600')} />,   unread ? 'bg-amber-100'   : 'bg-slate-100')
  return                                       s(<Bell             className={c('text-brand-600')} />,   unread ? 'bg-brand-100'   : 'bg-slate-100')
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen:         boolean
  onClose:        () => void
  role:           'assisteur' | 'loueur'
  onUnreadChange: (n: number) => void
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function NotificationPanel({ isOpen, onClose, role, onUnreadChange }: Props) {
  const [notifs,  setNotifs]  = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const router = useRouter()

  const basePath = role === 'assisteur' ? '/assisteur/demandes' : '/loueur/demandes'

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getNotifications()
    setNotifs(data)
    onUnreadChange(data.filter(n => !n.read).length)
    setLoading(false)
  }, [onUnreadChange])

  // Charger à chaque ouverture
  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  // Fermer sur Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const unread = notifs.filter(n => !n.read).length

  async function handleClick(notif: PlatformNotification) {
    if (!notif.read) {
      await markAsRead(notif.id)
      const updated = notifs.map(n => n.id === notif.id ? { ...n, read: true } : n)
      setNotifs(updated)
      onUnreadChange(updated.filter(n => !n.read).length)
    }
    if (notif.requestId) {
      onClose()
      router.push(`${basePath}/${notif.requestId}`)
    }
  }

  async function handleMarkAll() {
    setMarking(true)
    await markAllAsRead()
    const updated = notifs.map(n => ({ ...n, read: true }))
    setNotifs(updated)
    onUnreadChange(0)
    setMarking(false)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={[
          'fixed inset-0 bg-black/30 z-40 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={[
          'fixed top-0 right-0 h-screen w-full max-w-sm bg-white shadow-2xl z-50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-slate-900 text-sm">Notifications</h2>
            {unread > 0 && (
              <span className="bg-brand-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={marking}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {marking
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <CheckCheck className="w-3 h-3" />
                }
                Tout lire
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-1 p-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                    <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Aucune notification</p>
                <p className="text-xs text-slate-400 mt-0.5">Vous êtes à jour.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-px p-3">
              {notifs.map(notif => {
                const isUnread = !notif.read
                const style    = getStyle(notif.type, isUnread)

                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={[
                      'w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm',
                      style.cardBg,
                    ].join(' ')}
                  >
                    {/* Icône */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
                      {style.icon}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className={`text-xs leading-snug truncate ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">{notif.body}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{relativeTime(notif.createdAt)}</p>
                    </div>

                    {/* Dot */}
                    {isUnread && (
                      <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0 mt-1.5`} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
