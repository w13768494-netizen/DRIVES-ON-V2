import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAssisteurOrgAdmin }       from '@/lib/requireAssisteurOrgAdmin'

const TEAM_ROLES = ['admin', 'superviseur', 'charge_assistance'] as const

// PATCH /api/assisteur/team/[memberId] — body: { team_role?, is_active? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const auth = await requireAssisteurOrgAdmin()
  if (!auth.ok) return auth.response

  const { memberId } = await params
  const { team_role, is_active } = await request.json() as {
    team_role?: string; is_active?: boolean
  }

  if (team_role === undefined && is_active === undefined) {
    return NextResponse.json({ error: 'Rien à modifier' }, { status: 400 })
  }
  if (team_role !== undefined && !TEAM_ROLES.includes(team_role as typeof TEAM_ROLES[number])) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // La cible doit appartenir à la même org
  const { data: target } = await supabaseAdmin
    .from('profiles').select('id, org_id, team_role, is_active')
    .eq('id', memberId).single()

  if (!target || target.org_id !== auth.orgId) {
    return NextResponse.json({ error: 'Membre introuvable dans votre organisation' }, { status: 404 })
  }

  // Garde « dernier admin » : on ne peut pas retirer/désactiver le seul admin
  const losesAdmin =
    (team_role !== undefined && target.team_role === 'admin' && team_role !== 'admin') ||
    (is_active === false && target.team_role === 'admin')
  if (losesAdmin) {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', auth.orgId).eq('team_role', 'admin').eq('is_active', true)
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Impossible : dernier administrateur actif de l\'organisation' }, { status: 422 })
    }
  }

  const patch: Record<string, unknown> = {}
  if (team_role !== undefined) patch.team_role = team_role
  if (is_active !== undefined) patch.is_active = is_active

  const { error } = await supabaseAdmin.from('profiles').update(patch).eq('id', memberId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
