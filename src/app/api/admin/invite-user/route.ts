import { createClient }                   from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail }                      from '@/lib/email'
import { buildInviteEmailHtml }           from '@/lib/inviteEmail'
import { requireAdmin }                   from '@/lib/requireAdmin'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { email, role, full_name, company_name, requestId } =
    await request.json() as {
      email:        string
      role:         'loueur' | 'assisteur'
      full_name:    string
      company_name: string | null
      requestId?:   string
    }

  if (!email || !role || !full_name) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data, error } = await adminClient.auth.admin.generateLink({
    type:  'invite',
    email,
    options: {
      data:       { role, full_name, company_name: company_name ?? '' },
      redirectTo: `${origin}/auth/set-password`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      return NextResponse.json({ error: 'USER_ALREADY_EXISTS' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const inviteLink =
    `${origin}/auth/callback` +
    `?token_hash=${data.properties.hashed_token}` +
    `&type=invite` +
    `&next=/auth/set-password`

  const emailResult = await sendEmail({
    to:      email,
    subject: 'Votre accès Drives On est prêt',
    html:    buildInviteEmailHtml({ fullName: full_name, role, inviteLink }),
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
