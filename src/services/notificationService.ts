import { supabase } from '@/lib/supabaseClient'

export interface PlatformNotification {
  id:        string
  agencyId:  string
  type:      string
  title:     string
  body:      string
  requestId: string | null
  readAt:    Date | null
  createdAt: Date
}

interface DbNotif {
  id:         string
  agency_id:  string
  type:       string
  title:      string
  body:       string
  request_id: string | null
  read_at:    string | null
  created_at: string
}

function rowToNotif(row: DbNotif): PlatformNotification {
  return {
    id:        row.id,
    agencyId:  row.agency_id,
    type:      row.type,
    title:     row.title,
    body:      row.body,
    requestId: row.request_id,
    readAt:    row.read_at ? new Date(row.read_at) : null,
    createdAt: new Date(row.created_at),
  }
}

export async function getNotifications(agencyIds: string[]): Promise<PlatformNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .in('agency_id', agencyIds)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return (data as DbNotif[]).map(rowToNotif)
}

export async function getUnreadCount(agencyIds: string[]): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .in('agency_id', agencyIds)
    .is('read_at', null)
  return !error && count ? count : 0
}

export async function markAsRead(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
}

export async function markAllAsRead(agencyIds: string[]): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('agency_id', agencyIds)
    .is('read_at', null)
}
