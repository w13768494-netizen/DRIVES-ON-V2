import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { sendEmail }                      from '@/lib/email'
import { buildInviteEmailHtml, buildInviteEmailText } from '@/lib/inviteEmail'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { getAppUrl }                      from '@/lib/appUrl'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const {
    email,
    full_name,
    company_name,
    phone,
    agency_name,
    address,
    city,
    postal_code,
    service_radius_km,
  } = await request.json() as {
    email:             string
    full_name:         string
    company_name:      string | null
    phone:             string | null
    agency_name:       string
    address:           string | null
    city:              string | null
    postal_code:       string | null
    service_radius_km: number | null
  }

  if (!email || !full_name || !agency_name) {
    return NextResponse.json({ error: 'Champs obligatoires manquants (email, nom, agence).' }, { status: 400 })
  }

  const appUrl = getAppUrl()

  // ── Étape 1 : créer auth.user + profil via generateLink ───────────────────
  const { data, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
    type:  'invite',
    email,
    options: {
      data:       { role: 'loueur', full_name, company_name: company_name ?? '' },
      redirectTo: `${appUrl}/auth/set-password`,
    },
  })

  if (inviteError) {
    if (inviteError.message.toLowerCase().includes('already been registered')) {
      return NextResponse.json({ error: 'USER_ALREADY_EXISTS' }, { status: 409 })
    }
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const userId = data.user?.id
  if (!userId) {
    return NextResponse.json(
      { error: 'Impossible de récupérer l\'identifiant utilisateur après la création.' },
      { status: 500 },
    )
  }

  const inviteLink =
    `${appUrl}/auth/callback` +
    `?token_hash=${data.properties.hashed_token}` +
    `&type=invite` +
    `&next=/auth/set-password`

  // ── Étape 2 : créer l'agence liée ────────────────────────────────────────
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('rental_agencies')
    .insert({
      owner_id:          userId,
      agency_name,
      company_name:      company_name ?? null,
      contact_name:      full_name,
      email,
      phone:             phone ?? null,
      address:           address ?? null,
      city:              city ?? null,
      postal_code:       postal_code ?? null,
      service_radius_km: service_radius_km ?? null,
      active:            true,
      is_available:      true,
    })
    .select('id')
    .single()

  if (agencyError) {
    return NextResponse.json({
      partial:  true,
      userId,
      step:     'rental_agencies',
      error:    agencyError.message,
      action:   `Compte créé (user_id: ${userId}). Créez l'agence manuellement dans Supabase avec owner_id = "${userId}".`,
    }, { status: 207 })
  }

  // ── Étape 3 : envoyer l'email d'invitation ────────────────────────────────
  const emailResult = await sendEmail({
    to:      email,
    subject: 'Votre accès Drives On est prêt',
    html:    buildInviteEmailHtml({ fullName: full_name, role: 'loueur', inviteLink }),
    text:    buildInviteEmailText({ fullName: full_name, role: 'loueur', inviteLink }),
  })

  if (!emailResult.ok) {
    return NextResponse.json({
      partial:  true,
      userId,
      agencyId: agency.id,
      step:     'email',
      error:    emailResult.error,
      action:   `Compte et agence créés. Renvoyez l'invitation depuis /admin/utilisateurs → menu du compte.`,
    }, { status: 207 })
  }

  return NextResponse.json({ success: true, userId, agencyId: agency.id })
}
