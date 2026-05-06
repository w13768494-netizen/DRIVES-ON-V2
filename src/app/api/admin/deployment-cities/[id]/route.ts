import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { DeploymentStatus } from '@/types/deploymentCity'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const VALID_STATUSES: DeploymentStatus[] = ['active', 'deploying', 'planned', 'inactive']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let status: DeploymentStatus
  try {
    const body = await req.json()
    status = body.status
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { status }
  if (status === 'active') patch.activated_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('deployment_cities')
    .update(patch)
    .eq('id', id)

  if (error) {
    console.error(`[deployment-cities] PATCH ${id}:`, error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  console.log(`[deployment-cities] ${id} → ${status}`)
  return NextResponse.json({ ok: true })
}
