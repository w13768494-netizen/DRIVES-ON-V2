import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { SidebarShell }   from '@/components/shared/SidebarShell'

export default function LoueurLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="loueur">
      <SidebarShell role="loueur">
        {children}
      </SidebarShell>
    </ProtectedRoute>
  )
}
