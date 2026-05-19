import { NextResponse, type NextRequest } from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { supabaseAdmin }   from '@/lib/supabase/admin'

type PatchBody = {
  stock_live: number | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'loueur') {
    return NextResponse.json({ error: 'Accès réservé aux loueurs' }, { status: 403 })
  }

  // ── Paramètres ────────────────────────────────────────────────────────────────
  const { id: variantId } = await params
  const body = await request.json() as PatchBody

  if (!('stock_live' in body))
    return NextResponse.json({ error: 'Champ stock_live requis' }, { status: 400 })

  const { stock_live } = body
  if (stock_live !== null && (!Number.isInteger(stock_live) || stock_live < 0))
    return NextResponse.json({ error: 'stock_live doit être un entier ≥ 0 ou null' }, { status: 400 })

  // ── Vérification ownership ────────────────────────────────────────────────────
  // Récupérer agency_id de la variante
  const { data: variant, error: variantError } = await supabaseAdmin
    .from('agency_vehicle_categories')
    .select('agency_id')
    .eq('id', variantId)
    .single()

  if (variantError || !variant)
    return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 })

  // Vérifier que l'agence appartient au loueur connecté
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('rental_agencies')
    .select('id')
    .eq('id', variant.agency_id)
    .eq('owner_id', user.id)
    .single()

  if (agencyError || !agency)
    return NextResponse.json({ error: 'Non autorisé — cette variante ne vous appartient pas' }, { status: 403 })

  // ── Mise à jour ───────────────────────────────────────────────────────────────
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('agency_vehicle_categories')
    .update({ stock_live })
    .eq('id', variantId)
    .select('id, stock_live, stock_estimate')
    .single()

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    ok:             true,
    variantId,
    stock_live:     updated.stock_live,
    stock_estimate: updated.stock_estimate,
    effective:      updated.stock_live ?? updated.stock_estimate,
  })
}
