import { NextResponse }              from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { requireAssisteurOrgAdmin }  from '@/lib/requireAssisteurOrgAdmin'

// GET /api/assisteur/team — liste les membres de l'organisation de l'appelant
export async function GET() {
  const auth = await requireAssisteurOrgAdmin()
  if (!auth.ok) return auth.response

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, team_role, is_active')
    .eq('org_id', auth.orgId)
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Emails depuis auth (non stockés dans profiles)
  const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailById = new Map((usersPage?.users ?? []).map(u => [u.id, u.email ?? '']))

  const members = (data ?? []).map(p => ({
    id:        p.id,
    fullName:  p.full_name,
    email:     emailById.get(p.id) ?? '',
    teamRole:  p.team_role,
    isActive:  p.is_active,
  }))

  return NextResponse.json({ members })
}
