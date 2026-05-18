import { NextResponse }   from 'next/server'
import { supabaseAdmin }  from '@/lib/supabase/admin'
import { requireAdmin }   from '@/lib/requireAdmin'
import type { AdminUser } from '@/types/adminUser'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { data: authData, error: authErr } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('id, role, account_type, full_name, company_name, phone, is_active')
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

  const profileMap = new Map((profiles ?? []).map(p => [p.id as string, p]))

  const loueurIds = (profiles ?? [])
    .filter(p => p.role === 'loueur')
    .map(p => p.id as string)

  const agencyCounts = new Map<string, number>()
  if (loueurIds.length > 0) {
    const { data: agencies } = await supabaseAdmin
      .from('rental_agencies')
      .select('owner_id')
      .in('owner_id', loueurIds)
    for (const a of agencies ?? []) {
      const oid = a.owner_id as string
      agencyCounts.set(oid, (agencyCounts.get(oid) ?? 0) + 1)
    }
  }

  const users: AdminUser[] = authData.users
    .filter(u => profileMap.has(u.id))
    .map(u => {
      const p = profileMap.get(u.id)!
      return {
        id:              u.id,
        email:           u.email ?? '',
        role:            p.role as AdminUser['role'],
        account_type:    (p.account_type as AdminUser['account_type']) ?? null,
        full_name:       p.full_name as string,
        company_name:    (p.company_name as string | null) ?? null,
        phone:           (p.phone as string | null) ?? null,
        is_active:       (p.is_active as boolean) ?? true,
        agency_count:    agencyCounts.get(u.id) ?? 0,
        created_at:      u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }
    })

  return NextResponse.json(users)
}
