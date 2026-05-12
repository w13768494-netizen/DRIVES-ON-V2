import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { sendEmail }                      from '@/lib/email'
import { buildResetEmailHtml, buildResetEmailText } from '@/lib/inviteEmail'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { getAppUrl }                      from '@/lib/appUrl'

const adminClient = supabaseAdmin

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { email, full_name } = await request.json() as { email: string; full_name?: string }
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  // Anti-spam : bloquer si un email de réinitialisation a déjà été envoyé dans les 5 dernières minutes
  const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = usersPage?.users.find(u => u.email === email)
  if (existing?.recovery_sent_at) {
    const elapsed = Date.now() - new Date(existing.recovery_sent_at).getTime()
    if (elapsed < 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Un email de réinitialisation a déjà été envoyé à cette adresse récemment. Veuillez patienter.' },
        { status: 429 },
      )
    }
  }

  const appUrl = getAppUrl()

  const { data, error } = await adminClient.auth.admin.generateLink({
    type:    'recovery',
    email,
    options: { redirectTo: `${appUrl}/auth/set-password` },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const resetLink =
    `${appUrl}/auth/callback` +
    `?token_hash=${data.properties.hashed_token}` +
    `&type=recovery` +
    `&next=/auth/set-password`

  const emailResult = await sendEmail({
    to:      email,
    subject: 'Accédez à votre espace Drives On',
    html:    buildResetEmailHtml({ fullName: full_name ?? '', resetLink }),
    text:    buildResetEmailText({ fullName: full_name ?? '', resetLink }),
  })

  if (!emailResult.ok) {
    return NextResponse.json({ error: `Email non envoyé : ${emailResult.error}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
