import type { Role } from '@/domain/types'
import { useAuthStore } from '@/store/auth-store'
import { PermissionDeniedPage } from './PermissionDeniedPage'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const activeRole = useAuthStore((s) => s.activeRole)

  if (!activeRole || !allowedRoles.includes(activeRole)) {
    return <PermissionDeniedPage />
  }

  return <>{children}</>
}
