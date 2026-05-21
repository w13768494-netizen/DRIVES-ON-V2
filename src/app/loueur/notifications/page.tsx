'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, CheckCheck, Loader2,
  Zap, AlertTriangle, FileWarning, CalendarPlus, Car, FileText,
} from 'lucide-react'
import { getNotifications, markAsRead, markAllAsRead } from '@/services/notificationService'
import { relativeTime } from '@/lib/operationalPriority'
import type { PlatformNotification } from '@/services/notificationService'

// ── Type config ───────────────────────────────────────────────────────────────

interface NotifStyle {
  icon:        React.ReactNode
  iconBg:      string
  iconColor:   string
  cardUnread:  string
  cardRead:    string
  dot:         string
}

function getNotifStyle(type: string, isUnread: boolean): NotifStyle {
  const isCritical = ['overdue', 'damage_claim'].includes(type)

  const base = (icon: React.ReactNode, iconBg: string, iconColor: string): NotifStyle => ({
    icon,
    iconBg,
    iconColor,
    cardUnread: isCritical
      ? 'bg-red-50 border-red-200 hover:bg-red-100'
      : 'bg-brand-50 border-brand-200 hover:bg-brand-100',
    cardRead: 'bg-white border-slate-200 hover:bg-slate-50',
    dot: isCritical ? 'bg-red-500' : 'bg-brand-500',
  })

  if (type === 'overdue')
    return base(
      <AlertTriangle className={`w-4 h-4 ${isUnread ? 'text-red-600' : 'text-slate-400'}`} />,
      isUnread ? 'bg-red-100' : 'bg-slate-100',
      '',
    )
  if (type === 'damage_claim')
    return base(
      <FileWarning className={`w-4 h-4 ${isUnread ? 'text-orange-600' : 'text-slate-400'}`} />,
      isUnread ? 'bg-orange-100' : 'bg-slate-100',
      '',
    )
  if (type === 'new_request')
    return base(
      <Zap className={`w-4 h-4 ${isUnread ? 'text-brand-600' : 'text-slate-400'}`} />,
      isUnread ? 'bg-brand-100' : 'bg-slate-100',
      '',
    )
  if (type === 'extension_demandee')
    return base(
      <CalendarPlus className={`w-4 h-4 ${isUnread ? 'text-amber-600' : 'text-slate-400'}`} />,
      isUnread ? 'bg-amber-100' : 'bg-slate-100',
      '',
    )
  if (type === 'retour_confirme')
    return base(
      <Car className={`w-4 h-4 ${isUnread ? 'text-blue-600' : 'text-slate-400'}`} />,
      isUnread ? 'bg-blue-100' : 'bg-slate-100',
      '',
    )
  // default / sinistre_declare / admin_*
  return base(
    <Bell className={`w-4 h-4 ${isUnread ? 'text-brand-600' : 'text-slate-400'}`} />,
    isUnread ? 'bg-brand-100' : 'bg-slate-100',
    '',
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoueurNotificationsPage() {
  const [notifs,   setNotifs]   = useState<PlatformNotification[]>([])
  const [loading,  setLoading]  = useState(true)
  const [marking,  setMarking]  = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    const data = await getNotifications()
    setNotifs(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const unread = notifs.filter(n => !n.read).length

  async function handleClick(notif: PlatformNotification) {
    if (!notif.read) {
      await markAsRead(notif.id)
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
    }
    if (notif.requestId) {
      router.push(`/loueur/demandes/${notif.requestId}`)
    }
  }

  async function handleMarkAll() {
    setMarking(true)
    await markAllAsRead()
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setMarking(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
          {unread > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {unread} non lue{unread > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={marking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {marking
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCheck className="w-4 h-4" />
            }
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Bell className="w-7 h-7 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Aucune notification</p>
            <p className="text-sm text-slate-400 mt-1">Les nouvelles demandes apparaîtront ici.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifs.map(notif => {
            const isUnread = !notif.read
            const style    = getNotifStyle(notif.type, isUnread)

            return (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={[
                  'w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all',
                  isUnread ? style.cardUnread : style.cardRead,
                ].join(' ')}
              >
                {/* Icône */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
                  {style.icon}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{relativeTime(notif.createdAt)}</p>
                </div>

                {/* Point non lu */}
                {isUnread && (
                  <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0 mt-1.5`} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
