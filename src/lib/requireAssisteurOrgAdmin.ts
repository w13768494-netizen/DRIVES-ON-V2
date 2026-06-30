import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

type Ok   = { ok: true;  userId: string; orgId: string }
type Fail = { ok: false; response: NextResponse }

/**
 * Vérifie que l'appelant est un assisteur avec team_role='admin' et une org.
 * Renvoie son userId + orgId. À appeler en tête des routes /api/assisteur/team/*.
 */
export async function requireAssisteurOrgAdmin(): Promise<Ok | Fail> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_role, org_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'assisteur' || profile.team_role !== 'admin' || !profile.org_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé à l'admin de l'organisation" }, { status: 403 }),
    }
  }
  if (!profile.is_active) {
    return { ok: false, response: NextResponse.json({ error: 'Compte suspendu' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, orgId: profile.org_id as string }
}
