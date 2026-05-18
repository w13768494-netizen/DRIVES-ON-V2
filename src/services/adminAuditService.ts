import { supabase } from '@/lib/supabaseClient'
import type { AdminAction, AdminTargetType } from '@/types/adminAuditLog'

interface LogParams {
  action:      AdminAction
  targetType:  AdminTargetType
  targetId:    string
  beforeJson?: Record<string, unknown> | null
  afterJson?:  Record<string, unknown> | null
  metadata?:   Record<string, unknown>
}

// Best-effort — jamais throw, jamais bloquant pour l'action principale.
// Si le log échoue, l'action admin est déjà effectuée et reste valide.
export async function logAdminAction(params: LogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[adminAuditService] logAdminAction: aucun utilisateur connecté')
      return
    }
    const { error } = await supabase.from('admin_audit_logs').insert({
      admin_id:    user.id,
      action:      params.action,
      target_type: params.targetType,
      target_id:   params.targetId,
      before_json: params.beforeJson ?? null,
      after_json:  params.afterJson  ?? null,
      metadata:    params.metadata   ?? null,
    })
    if (error) console.error('[adminAuditService] logAdminAction:', error.message)
  } catch (err) {
    console.error('[adminAuditService] logAdminAction inattendu:', err)
  }
}
