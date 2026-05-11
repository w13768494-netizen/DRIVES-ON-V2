import { NextRequest, NextResponse }                        from 'next/server'
import { supabaseAdmin }                                    from '@/lib/supabase/admin'
import { requireAuth }                                      from '@/lib/requireAuth'
import { canAccessRequest, rowToResponse }                  from '@/lib/documents/helpers'
import type { DocumentRow, DocumentApiResponse }            from '@/lib/documents/helpers'

// GET /api/documents?requestId=<uuid>
// Retourne la liste des documents d'une demande avec signed URLs (1h).
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const requestId = req.nextUrl.searchParams.get('requestId')
  if (!requestId) {
    return NextResponse.json(
      { error: 'Paramètre requestId manquant.' },
      { status: 400 },
    )
  }

  // Récupérer la demande pour vérifier les droits d'accès
  const { data: ar } = await supabaseAdmin
    .from('assistance_requests')
    .select('id, created_by_user_id, assigned_agency_id, assigned_agency_ids')
    .eq('id', requestId)
    .single()

  if (!ar) {
    return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  }

  const hasAccess = await canAccessRequest(auth.userId, auth.role, ar as {
    created_by_user_id:  string | null
    assigned_agency_id:  string | null
    assigned_agency_ids: string[] | null
  })

  if (!hasAccess) {
    return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 403 })
  }

  // Charger les documents triés du plus récent au plus ancien
  const { data: rows, error: docsError } = await supabaseAdmin
    .from('request_documents')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 })
  }

  const typedRows = (rows ?? []) as unknown as DocumentRow[]

  // Générer les signed URLs en parallèle (TTL 1h)
  const docs: DocumentApiResponse[] = await Promise.all(
    typedRows.map(async (row) => {
      let viewUrl: string | undefined

      if (row.storage_path) {
        const { data } = await supabaseAdmin.storage
          .from('request-documents')
          .createSignedUrl(row.storage_path, 3600)
        viewUrl = data?.signedUrl ?? undefined
      } else if (row.url) {
        viewUrl = row.url
      }

      return rowToResponse(row, viewUrl)
    }),
  )

  return NextResponse.json(docs)
}
