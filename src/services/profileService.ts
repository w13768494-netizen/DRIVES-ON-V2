import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/session'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  company_name: string | null
}

export async function getProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_name')
    .eq('id', user.id)
    .single()

  return (data as Profile) ?? null
}
