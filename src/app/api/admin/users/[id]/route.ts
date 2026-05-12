import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAdmin }                   from '@/lib/requireAdmin'

type PatchBody = {
  full_name?:    string
  company_name?: string | null
  phone?:        string | null
  role?:         string
  email?:        string
  action?:       'suspend' | 'reactivate'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json() as PatchBody

  // ── Profile updates ────────────────────────────────────────────────────────
  const profilePatch: Record<string, unknown> = {}

  if (body.action === 'suspend')         profilePatch.is_active    = false
  if (body.action === 'reactivate')      profilePatch.is_active    = true
  if (body.phone    !== undefined)       profilePatch.phone        = body.phone
  if (body.full_name !== undefined)      profilePatch.full_name    = body.full_name
  if (body.company_name !== undefined)   profilePatch.company_name = body.company_name

  if (body.role !== undefined) {
    if (id === auth.userId)
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier votre propre rôle.' },
        { status: 403 },
      )
    if (body.role !== 'admin') {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .neq('id', id)
      if ((count ?? 0) === 0)
        return NextResponse.json(
          { error: "Impossible : il n'y aurait plus aucun administrateur." },
          { status: 409 },
        )
    }
    profilePatch.role = body.role
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(profilePatch)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Auth updates (email + user_metadata sync) ──────────────────────────────
  const authPatch: {
    email?: string
    user_metadata?: Record<string, string>
  } = {}

  if (body.email !== undefined) authPatch.email = body.email

  if (body.full_name !== undefined || body.company_name !== undefined) {
    authPatch.user_metadata = {}
    if (body.full_name !== undefined)
      authPatch.user_metadata.full_name = body.full_name
    if (body.company_name !== undefined)
      authPatch.user_metadata.company_name = body.company_name ?? ''
  }

  if (Object.keys(authPatch).length > 0) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, authPatch)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params

  if (id === auth.userId)
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
      { status: 403 },
    )

  // Check dependencies
  const [reqsRes, agencyRes] = await Promise.all([
    supabaseAdmin
      .from('assistance_requests')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_user_id', id),
    supabaseAdmin
      .from('rental_agencies')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', id),
  ])

  const hasDeps = (reqsRes.count ?? 0) > 0 || (agencyRes.count ?? 0) > 0

  if (hasDeps) {
    await Promise.all([
      supabaseAdmin.from('profiles').update({ is_active: false }).eq('id', id),
      supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: { full_name: '[Supprimé]', company_name: '[Supprimé]' },
      }),
      supabaseAdmin
        .from('rental_agencies')
        .update({ is_available: false })
        .eq('owner_id', id),
    ])
    return NextResponse.json({ action: 'soft_deleted', reason: 'dependencies' })
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: 'hard_deleted' })
}
