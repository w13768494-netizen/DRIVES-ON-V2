import type { NextRequest }                            from 'next/server'
import { NextResponse }              from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { requireAssisteurOrgAdmin }  from '@/lib/requireAssisteurOrgAdmin'
import { sendEmail }                                   from '@/lib/email'
import { buildInviteEmailHtml, buildInviteEmailText }  from '@/lib/inviteEmail'
import { getAppUrl }                                   from '@/lib/appUrl'

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

const TEAM_ROLES = ['admin', 'superviseur', 'charge_assistance'] as const

// POST /api/assisteur/team/invite n'existe pas comme sous-route : on poste sur /api/assisteur/team
export async function POST(request: NextRequest) {
  const auth = await requireAssisteurOrgAdmin()
  if (!auth.ok) return auth.response

  const { email, full_name, team_role } = await request.json() as {
    email?: string; full_name?: string; team_role?: string
  }

  if (!email || !full_name || !team_role) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }
  if (!TEAM_ROLES.includes(team_role as typeof TEAM_ROLES[number])) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // L'org définit account_type + nom (company_name) hérités par le membre
  const { data: org } = await supabaseAdmin
    .from('organizations').select('name, account_type').eq('id', auth.orgId).single()

  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 500 })
  }

  const appUrl = getAppUrl()
  const meta = {
    role:         'assisteur',
    full_name,
    company_name: org?.name ?? '',
    account_type: org?.account_type ?? null,
    org_id:       auth.orgId,
    team_role,
  }

  let { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite', email,
    options: { data: meta, redirectTo: `${appUrl}/auth/set-password` },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = usersPage?.users.find(u => u.email === email)
      if (existing?.email_confirmed_at) {
        return NextResponse.json({ error: 'USER_ALREADY_EXISTS' }, { status: 409 })
      }
      if (existing?.invited_at) {
        const elapsed = Date.now() - new Date(existing.invited_at).getTime()
        if (elapsed < 5 * 60 * 1000) {
          return NextResponse.json({ error: 'Invitation déjà envoyée très récemment.' }, { status: 429 })
        }
        const del = await supabaseAdmin.auth.admin.deleteUser(existing.id)
        if (del.error) {
          return NextResponse.json({ error: 'Impossible de réinitialiser une invitation existante' }, { status: 500 })
        }
      }
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite', email,
        options: { data: meta, redirectTo: `${appUrl}/auth/set-password` },
      })
      if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 400 })
      data = retry.data
    } else {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  if (!data?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Token introuvable' }, { status: 500 })
  }

  const inviteLink =
    `${appUrl}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
    `&type=invite&next=/auth/set-password`

  const emailResult = await sendEmail({
    to: email,
    subject: 'Votre accès Drives On est prêt',
    html: buildInviteEmailHtml({ fullName: full_name, role: 'assisteur', inviteLink }),
    text: buildInviteEmailText({ fullName: full_name, role: 'assisteur', inviteLink }),
  })
  if (!emailResult.ok) {
    return NextResponse.json({ error: `Email non envoyé : ${emailResult.error}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}
