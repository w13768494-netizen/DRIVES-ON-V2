import { createClient }                   from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // ── Paramètres de l'invitation ───────────────────────────────────────────────
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

  // ── Invitation via service role ──────────────────────────────────────────────
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data:       { role, full_name, company_name: company_name ?? '' },
    redirectTo: `${origin}/auth/set-password`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // ── Marquer la demande comme approuvée ───────────────────────────────────────
  if (requestId) {
    await adminClient
      .from('access_requests')
      .update({
        status:      'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}
