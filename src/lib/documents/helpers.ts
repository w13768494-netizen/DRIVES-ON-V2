import { supabaseAdmin }    from '@/lib/supabase/admin'
import type { RequestDocumentType, RequestDocumentOwner, DocumentValidationStatus } from '@/types/requestDocument'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentRow {
  id:                  string
  request_id:          string
  type:                string
  owner:               string
  file_name:           string
  storage_path:        string | null
  url:                 string | null
  mime_type:           string | null
  size_bytes:          number | null
  comment:             string | null
  uploaded_by_user_id: string | null
  created_at:          string | null
  validation_status:   string | null
  validated_at:        string | null
  validated_by:        string | null
  validation_note:     string | null
}

export interface DocumentApiResponse {
  id:               string
  requestId:        string
  type:             RequestDocumentType
  owner:            RequestDocumentOwner
  fileName:         string
  addedAt:          string
  comment?:         string
  sizeKb?:          number
  viewUrl?:         string  // signed URL (fichier Storage) ou URL externe
  url?:             string  // URL externe uniquement — pour distinguer l'icône Link vs Eye
  validationStatus: DocumentValidationStatus
  validatedAt?:     string
  validationNote?:  string
}

interface RequestAccessRow {
  created_by_user_id:  string | null
  assigned_agency_id:  string | null
  assigned_agency_ids: string[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function rowToResponse(row: DocumentRow, viewUrl?: string): DocumentApiResponse {
  const vs = row.validation_status as DocumentValidationStatus | null
  return {
    id:               row.id,
    requestId:        row.request_id,
    type:             row.type   as RequestDocumentType,
    owner:            row.owner  as RequestDocumentOwner,
    fileName:         row.file_name,
    addedAt:          row.created_at ?? new Date().toISOString(),
    comment:          row.comment   ?? undefined,
    sizeKb:           row.size_bytes != null ? Math.round(row.size_bytes / 1024) : undefined,
    viewUrl,
    url:              row.url        ?? undefined,
    validationStatus: vs === 'valid' || vs === 'rejected' ? vs : 'pending',
    validatedAt:      row.validated_at  ?? undefined,
    validationNote:   row.validation_note ?? undefined,
  }
}

// Vérifie qu'un utilisateur a accès à une demande.
// Chaîne loueur : rental_agencies.owner_id → assigned_agency_id / assigned_agency_ids
// avec bridge external_id pour la compatibilité des anciens IDs mock.
export async function canAccessRequest(
  userId: string,
  role:   string,
  ar:     RequestAccessRow,
): Promise<boolean> {
  if (role === 'admin') return true

  if (role === 'assisteur') {
    return ar.created_by_user_id === userId
  }

  if (role === 'loueur') {
    const agencyIds = [
      ...(ar.assigned_agency_ids ?? []),
      ...(ar.assigned_agency_id ? [ar.assigned_agency_id] : []),
    ]
    if (agencyIds.length === 0) return false

    const { data: agencies } = await supabaseAdmin
      .from('rental_agencies')
      .select('id, external_id')
      .eq('owner_id', userId)

    if (!agencies?.length) return false

    return agencies.some(
      a =>
        agencyIds.includes(a.id as string) ||
        (a.external_id != null && agencyIds.includes(a.external_id as string)),
    )
  }

  return false
}
