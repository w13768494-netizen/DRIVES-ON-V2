import type { AssistanceUserRole, TeamMember, UserStats } from '@/types/assistanceUser'
import type { AssistanceRequest } from '@/types/request'

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/assisteur/team')
  if (!res.ok) return []
  const body = await res.json() as { members: TeamMember[] }
  return body.members ?? []
}

export async function inviteMember(
  input: { email: string; fullName: string; teamRole: AssistanceUserRole },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/assisteur/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, full_name: input.fullName, team_role: input.teamRole }),
  })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({})) as { error?: string }
  return { ok: false, error: body.error ?? 'Erreur serveur' }
}

export async function updateMember(
  id: string,
  patch: { teamRole?: AssistanceUserRole; isActive?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/assisteur/team/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_role: patch.teamRole, is_active: patch.isActive }),
  })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({})) as { error?: string }
  return { ok: false, error: body.error ?? 'Erreur serveur' }
}

// Stats par membre, calculées côté client sur les demandes déjà chargées.
export function getUserStats(requests: AssistanceRequest[], userId: string): UserStats {
  const mine = requests.filter(r => r.createdByUserId === userId)
  const responseTimes: number[] = []
  for (const r of mine) {
    const evt = r.timeline.find(e => e.type === 'confirmation' || e.type === 'refus')
    if (evt) {
      const atMs = evt.at instanceof Date ? evt.at.getTime() : new Date(evt.at as string).getTime()
      const createdMs = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt as string).getTime()
      responseTimes.push(atMs - createdMs)
    }
  }
  return {
    created:    mine.length,
    confirmee:  mine.filter(r => ['confirmee', 'honoree', 'cloturee'].includes(r.status)).length,
    refusee:    mine.filter(r => r.status === 'refusee').length,
    transferee: mine.filter(r => ['transferee', 'transfert_valide'].includes(r.status)).length,
    avgResponseMs: responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null,
  }
}
