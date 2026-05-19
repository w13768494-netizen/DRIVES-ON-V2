import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { sendEmail }                      from '@/lib/email'
import { buildInviteEmailHtml, buildInviteEmailText } from '@/lib/inviteEmail'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { getAppUrl }                      from '@/lib/appUrl'

const adminClient = supabaseAdmin

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { email, role, full_name, company_name, account_type, requestId } =
    await request.json() as {
      email:         string
      role:          'loueur' | 'assisteur'
      full_name:     string
      company_name:  string | null
      account_type?: string | null
      requestId?:    string
    }

  if (!email || !role || !full_name) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const appUrl = getAppUrl()

  let { data, error } = await adminClient.auth.admin.generateLink({
    type:  'invite',
    email,
    options: {
      data:       { role, full_name, company_name: company_name ?? '', account_type: account_type ?? null },
      redirectTo: `${appUrl}/auth/set-password`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = usersPage?.users.find(u => u.email === email)

      // Utilisateur confirmé → vrai doublon, bloquer
      if (existing?.email_confirmed_at) {
        return NextResponse.json({ error: 'USER_ALREADY_EXISTS' }, { status: 409 })
      }

      // Utilisateur invité mais non confirmé — anti-spam 5 min
      if (existing?.invited_at) {
        const elapsed = Date.now() - new Date(existing.invited_at).getTime()
        if (elapsed < 5 * 60 * 1000) {
          return NextResponse.json(
            { error: 'Une invitation a déjà été envoyée à cette adresse très récemment.' },
            { status: 429 },
          )
        }
        // Plus de 5 min : supprimer l'ancien user invité et recréer
        await adminClient.auth.admin.deleteUser(existing.id)
      }

      // Réessai après suppression
      const retry = await adminClient.auth.admin.generateLink({
        type:  'invite',
        email,
        options: {
          data:       { role, full_name, company_name: company_name ?? '', account_type: account_type ?? null },
          redirectTo: `${appUrl}/auth/set-password`,
        },
      })
      if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 400 })
      data = retry.data
    } else {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  if (!data?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Token introuvable après génération du lien' }, { status: 500 })
  }

  const inviteLink =
    `${appUrl}/auth/callback` +
    `?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
    `&type=invite` +
    `&next=/auth/set-password`

  const emailResult = await sendEmail({
    to:      email,
    subject: 'Votre accès Drives On est prêt',
    html:    buildInviteEmailHtml({ fullName: full_name, role, inviteLink }),
    text:    buildInviteEmailText({ fullName: full_name, role, inviteLink }),
  })

  if (!emailResult.ok) {
    return NextResponse.json({ error: `Email non envoyé : ${emailResult.error}` }, { status: 500 })
  }

  if (requestId) {
    await adminClient
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', requestId)
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}
