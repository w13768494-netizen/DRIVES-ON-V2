import { NextRequest, NextResponse }              from 'next/server'
import { supabaseAdmin }                          from '@/lib/supabase/admin'
import { requireAuth }                            from '@/lib/requireAuth'
import { canAccessRequest, rowToResponse }        from '@/lib/documents/helpers'
import type { DocumentRow }                       from '@/lib/documents/helpers'
import type { RequestDocumentType, RequestDocumentOwner } from '@/types/requestDocument'

// ── Validation fichier ────────────────────────────────────────────────────────

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
])

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.heif'])

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 Mo

const ALLOWED_TYPES_BY_OWNER: Record<RequestDocumentOwner, RequestDocumentType[]> = {
  assisteur: ['prise_en_charge', 'autre'],
  loueur:    ['contrat', 'etat_depart', 'etat_retour', 'facture', 'autre'],
}

// ── Magic bytes ───────────────────────────────────────────────────────────────

function isValidMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  switch (mimeType.toLowerCase()) {
    case 'application/pdf':
      // %PDF = 25 50 44 46
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    case 'image/jpeg':
      // FF D8 FF
      return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    case 'image/png':
      // 89 50 4E 47 0D 0A 1A 0A
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
          && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
    case 'image/heic':
    case 'image/heif':
      // ISO Base Media File Format : box "ftyp" (66 74 79 70) à l'offset 4
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    default:
      return false
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

// POST /api/documents/upload
// Body : multipart/form-data { file, requestId, type, owner, comment? }
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const file      = formData.get('file')      as File | null
  const requestId = formData.get('requestId') as string | null
  const type      = formData.get('type')      as RequestDocumentType | null
  const owner     = formData.get('owner')     as RequestDocumentOwner | null
  const comment   = formData.get('comment')   as string | null

  // ── Présence des champs requis ─────────────────────────────────────────────

  if (!file || !requestId || !type || !owner) {
    return NextResponse.json(
      { error: 'Champs requis manquants : file, requestId, type, owner.' },
      { status: 400 },
    )
  }

  // ── owner doit correspondre au rôle réel (sauf admin) ─────────────────────

  if (auth.role !== 'admin' && owner !== auth.role) {
    return NextResponse.json(
      { error: `Le champ owner "${owner}" ne correspond pas à votre rôle "${auth.role}".` },
      { status: 403 },
    )
  }

  // ── type doit être autorisé pour ce owner ─────────────────────────────────

  const allowedTypes =
    auth.role === 'admin'
      ? [...ALLOWED_TYPES_BY_OWNER.assisteur, ...ALLOWED_TYPES_BY_OWNER.loueur]
      : ALLOWED_TYPES_BY_OWNER[owner]

  if (!allowedTypes?.includes(type)) {
    return NextResponse.json(
      { error: `Type de document "${type}" non autorisé pour le rôle "${owner}".` },
      { status: 400 },
    )
  }

  // ── Validation fichier ─────────────────────────────────────────────────────

  if (file.size === 0) {
    return NextResponse.json({ error: 'Le fichier est vide.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Fichier trop volumineux (maximum 10 Mo).' },
      { status: 400 },
    )
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Type MIME non autorisé : "${file.type}". Formats acceptés : PDF, JPG, PNG, HEIC.` },
      { status: 400 },
    )
  }

  const dotIdx = file.name.lastIndexOf('.')
  const ext    = dotIdx >= 0 ? file.name.slice(dotIdx).toLowerCase() : ''

  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: `Extension non autorisée : "${ext}". Extensions acceptées : .pdf, .jpg, .jpeg, .png, .heic.` },
      { status: 400 },
    )
  }

  // ── Magic bytes : lecture unique du buffer ─────────────────────────────────
  // On lit le buffer ici pour valider le contenu, puis on le réutilise pour
  // l'upload Storage (évite une double lecture de fichiers potentiellement lourds).

  const fileBuffer  = await file.arrayBuffer()
  const headerBytes = new Uint8Array(fileBuffer.slice(0, 12))

  if (!isValidMagicBytes(headerBytes, file.type)) {
    return NextResponse.json(
      { error: 'Le contenu du fichier ne correspond pas à son type déclaré.' },
      { status: 400 },
    )
  }

  // ── Vérification accès à la demande ───────────────────────────────────────

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

  // ── Chemin Storage : {requestId}/{timestamp}-{nom_sécurisé} ───────────────

  const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
  const storagePath = `${requestId}/${Date.now()}-${safeName}`

  // ── Upload vers Supabase Storage ──────────────────────────────────────────

  const { error: uploadError } = await supabaseAdmin.storage
    .from('request-documents')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert:      false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: `Erreur Storage : ${uploadError.message}` },
      { status: 500 },
    )
  }

  // ── Insert métadonnées en base ─────────────────────────────────────────────

  const { data: row, error: dbError } = await supabaseAdmin
    .from('request_documents')
    .insert({
      request_id:          requestId,
      type,
      owner,
      file_name:           file.name,
      storage_path:        storagePath,
      mime_type:           file.type,
      size_bytes:          file.size,
      comment:             comment?.trim() || null,
      uploaded_by_user_id: auth.userId,
    })
    .select()
    .single()

  if (dbError || !row) {
    // Rollback : supprimer le fichier uploadé pour éviter les orphelins
    await supabaseAdmin.storage.from('request-documents').remove([storagePath])
    return NextResponse.json(
      { error: `Erreur base de données : ${dbError?.message ?? 'inconnue'}` },
      { status: 500 },
    )
  }

  // ── Signed URL pour affichage immédiat (1h) ───────────────────────────────

  const { data: signedData } = await supabaseAdmin.storage
    .from('request-documents')
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json(
    rowToResponse(row as unknown as DocumentRow, signedData?.signedUrl ?? undefined),
    { status: 201 },
  )
}
