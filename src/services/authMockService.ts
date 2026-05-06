import type { MockSession, UserRole } from '@/types/session'
import { setSession, clearSession } from './currentSessionService'
import { getUserByCredentials, touchLastLogin } from './assistanceUserService'
import { getLoueurByCode, touchLoueurLastLogin } from './loueurAccountService'

export function authenticate(
  role: UserRole,
  usernameOrCode: string,
  code?: string,
): MockSession | null {
  if (role === 'assisteur') {
    if (!code) return null
    const user = getUserByCredentials(usernameOrCode, code)
    if (!user) return null
    touchLastLogin(user.id)
    const session: MockSession = {
      role,
      userId:      user.id,
      userName:    `${user.firstName} ${user.lastName}`,
      company:     'Mutualia Assurances',
      companyRole: user.role,
      createdAt:   new Date().toISOString(),
    }
    setSession(session)
    return session
  }

  // Loueur — code seul, vérifié dans le store
  const account = getLoueurByCode(usernameOrCode)
  if (!account) return null
  touchLoueurLastLogin(account.id)
  const session: MockSession = {
    role,
    userId:    account.agencyId,
    userName:  account.userName,
    company:   account.agencyName,
    createdAt: new Date().toISOString(),
  }
  setSession(session)
  return session
}

export function logout(): void {
  clearSession()
}
