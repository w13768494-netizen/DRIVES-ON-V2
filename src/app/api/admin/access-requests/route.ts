import { createClient }                    from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin }                   from '@/lib/requireAdmin'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'

  const { data, error } = await adminClient
    .from('access_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id, status, reviewed_by } = await request.json() as {
    id:           string
    status:       'approved' | 'rejected'
    reviewed_by?: string
  }

  const { error } = await adminClient
    .from('access_requests')
    .update({ status, reviewed_by: reviewed_by ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
