import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { sendEmail }                      from '@/lib/email'
import { buildResetEmailHtml }            from '@/lib/inviteEmail'
import { requireAdmin }                   from '@/lib/requireAdmin'

const adminClient = supabaseAdmin

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { email, full_name } = await request.json() as { email: string; full_name?: string }
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data, error } = await adminClient.auth.admin.generateLink({
    type:    'recovery',
    email,
    options: { redirectTo: `${origin}/auth/set-password` },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const resetLink =
    `${origin}/auth/callback` +
    `?token_hash=${data.properties.hashed_token}` +
    `&type=recovery` +
    `&next=/auth/set-password`

  const emailResult = await sendEmail({
    to:      email,
    subject: 'Accédez à votre espace Drives On',
    html:    buildResetEmailHtml({ fullName: full_name ?? '', resetLink }),
  })

  if (!emailResult.ok) {
    return NextResponse.json({ error: `Email non envoyé : ${emailResult.error}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
