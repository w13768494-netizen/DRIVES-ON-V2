import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { SidebarShell }   from '@/components/shared/SidebarShell'

export default function AssisteurLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="assisteur">
      <SidebarShell role="assisteur">
        {children}
      </SidebarShell>
    </ProtectedRoute>
  )
}
