import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { requireAuth }               from '@/lib/requireAuth'
import { canAccessRequest }          from '@/lib/documents/helpers'

// DELETE /api/documents/:id
// Supprime un document : fichier Storage + métadonnée DB.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { id } = await params

  // ── Récupérer le document ─────────────────────────────────────────────────

  const { data: doc } = await supabaseAdmin
    .from('request_documents')
    .select('id, request_id, storage_path, uploaded_by_user_id, owner')
    .eq('id', id)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  }

  const docRow = doc as {
    id:                  string
    request_id:          string
    storage_path:        string | null
    uploaded_by_user_id: string | null
    owner:               string
  }

  // ── Récupérer la demande associée pour vérifier les droits ────────────────

  const { data: ar } = await supabaseAdmin
    .from('assistance_requests')
    .select('id, created_by_user_id, assigned_agency_id, assigned_agency_ids')
    .eq('id', docRow.request_id)
    .single()

  if (!ar) {
    return NextResponse.json({ error: 'Demande associée introuvable.' }, { status: 404 })
  }

  const hasRequestAccess = await canAccessRequest(auth.userId, auth.role, ar as {
    created_by_user_id:  string | null
    assigned_agency_id:  string | null
    assigned_agency_ids: string[] | null
  })

  if (!hasRequestAccess) {
    return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 403 })
  }

  // Un loueur ne peut supprimer que ses propres documents
  if (auth.role === 'loueur' && docRow.uploaded_by_user_id !== auth.userId) {
    return NextResponse.json(
      { error: 'Vous ne pouvez supprimer que les documents que vous avez uploadés.' },
      { status: 403 },
    )
  }

  // ── Suppression du fichier dans Storage ──────────────────────────────────

  if (docRow.storage_path) {
    const { error: storageError } = await supabaseAdmin.storage
      .from('request-documents')
      .remove([docRow.storage_path])

    if (storageError) {
      console.error('[documents/delete] Storage remove error:', storageError.message)
      // On continue : la métadonnée DB est supprimée même si Storage échoue,
      // pour éviter des entrées DB orphelines pointant vers un fichier déjà absent.
    }
  }

  // ── Suppression de la métadonnée en base ──────────────────────────────────

  const { error: dbError } = await supabaseAdmin
    .from('request_documents')
    .delete()
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
