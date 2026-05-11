import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

type AuthOk   = { ok: true;  userId: string; role: string }
type AuthFail = { ok: false; response: NextResponse }

export async function requireAuth(): Promise<AuthOk | AuthFail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok:       false,
      response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      ok:       false,
      response: NextResponse.json({ error: 'Profil introuvable' }, { status: 403 }),
    }
  }

  return { ok: true, userId: user.id, role: profile.role as string }
}
