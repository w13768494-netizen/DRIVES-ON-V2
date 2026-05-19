// Actions traçables par l'admin.
// Phase 1.5 : note_saved, flags_updated (actives)
// Phase 2+   : les autres (stubs pour forward-compat)
export type AdminAction =
  | 'note_saved'
  | 'flags_updated'
  | 'status_changed'
  | 'loueur_relance'
  | 'loueur_created'
  | 'access_request_accepted'
  | 'access_request_rejected'
  | 'user_suspended'
  | 'user_deleted'

export type AdminTargetType = 'request' | 'user' | 'agency' | 'access_request'

export interface AdminAuditLog {
  id:         string
  createdAt:  Date
  adminId:    string
  action:     AdminAction
  targetType: AdminTargetType
  targetId:   string
  beforeJson: Record<string, unknown> | null
  afterJson:  Record<string, unknown> | null
  metadata:   Record<string, unknown> | null
}
