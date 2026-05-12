import { supabase } from '@/lib/supabaseClient'

export interface PlatformNotification {
  id:        string
  agencyId:  string | null
  type:      string
  title:     string
  body:      string
  requestId: string | null
  read:      boolean
  createdAt: Date
}

interface DbNotif {
  id:         string
  agency_id:  string | null
  user_id:    string | null
  type:       string
  title:      string
  body:       string
  request_id: string | null
  read:       boolean
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
    read:      row.read,
    createdAt: new Date(row.created_at),
  }
}

// RLS filters automatically to user_id = auth.uid() — no agencyIds param needed.

export async function getNotifications(): Promise<PlatformNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return (data as DbNotif[]).map(rowToNotif)
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
  return !error && count ? count : 0
}

export async function markAsRead(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('read', false)
}

export async function markAllAsRead(): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)
}
