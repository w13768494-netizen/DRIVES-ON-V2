import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

type Ok   = { ok: true;  userId: string }
type Fail = { ok: false; response: NextResponse }

/**
 * Vérifie que la requête entrante provient d'un utilisateur authentifié avec le rôle "admin".
 * À appeler en première ligne de chaque route /api/admin/*.
 *
 * Usage :
 *   const auth = await requireAdmin()
 *   if (!auth.ok) return auth.response
 */
export async function requireAdmin(): Promise<Ok | Fail> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Accès réservé aux administrateurs' },
        { status: 403 },
      ),
    }
  }

  if (!profile.is_active) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Compte suspendu' }, { status: 403 }),
    }
  }

  return { ok: true, userId: user.id }
}
