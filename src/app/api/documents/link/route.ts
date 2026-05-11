import { NextRequest, NextResponse }              from 'next/server'
import { supabaseAdmin }                          from '@/lib/supabase/admin'
import { requireAuth }                            from '@/lib/requireAuth'
import { canAccessRequest, rowToResponse }        from '@/lib/documents/helpers'
import type { DocumentRow }                       from '@/lib/documents/helpers'
import type { RequestDocumentType, RequestDocumentOwner } from '@/types/requestDocument'

const ALLOWED_TYPES_BY_OWNER: Record<RequestDocumentOwner, RequestDocumentType[]> = {
  assisteur: ['prise_en_charge', 'autre'],
  loueur:    ['contrat', 'etat_depart', 'etat_retour', 'facture', 'autre'],
}

// POST /api/documents/link
// Enregistre un document externe (URL) sans fichier dans Storage.
// Body JSON : { url, requestId, type, owner, comment? }
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  let body: { url?: string; requestId?: string; type?: string; owner?: string; comment?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { url, requestId, type, owner, comment } = body

  if (!url || !requestId || !type || !owner) {
    return NextResponse.json(
      { error: 'Champs requis manquants : url, requestId, type, owner.' },
      { status: 400 },
    )
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return NextResponse.json(
      { error: "L'URL doit commencer par http:// ou https://." },
      { status: 400 },
    )
  }

  if (auth.role !== 'admin' && owner !== auth.role) {
    return NextResponse.json(
      { error: `Le champ owner "${owner}" ne correspond pas à votre rôle "${auth.role}".` },
      { status: 403 },
    )
  }

  const typedOwner = owner as RequestDocumentOwner
  const allowedTypes =
    auth.role === 'admin'
      ? [...ALLOWED_TYPES_BY_OWNER.assisteur, ...ALLOWED_TYPES_BY_OWNER.loueur]
      : ALLOWED_TYPES_BY_OWNER[typedOwner]

  if (!allowedTypes?.includes(type as RequestDocumentType)) {
    return NextResponse.json(
      { error: `Type de document "${type}" non autorisé pour le rôle "${owner}".` },
      { status: 400 },
    )
  }

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
    return NextResponse.json({ error: 'Accès non autorisé à cette demande.' }, { status: 403 })
  }

  const { data: row, error: dbError } = await supabaseAdmin
    .from('request_documents')
    .insert({
      request_id:          requestId,
      type:                type as RequestDocumentType,
      owner:               typedOwner,
      file_name:           'Lien externe',
      url,
      uploaded_by_user_id: auth.userId,
      comment:             comment?.trim() || null,
    })
    .select()
    .single()

  if (dbError || !row) {
    return NextResponse.json(
      { error: dbError?.message ?? 'Erreur inconnue' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    rowToResponse(row as unknown as DocumentRow, url),
    { status: 201 },
  )
}
