import type { ReactNode } from 'react'
import type { Role } from '@/domain/types'
import { useAuthStore } from '@/store/auth-store'
import { Tooltip } from './Tooltip'

export interface PermissionGateProps {
  allowedRoles: Role[]
  children: ReactNode
  fallback?: 'hide' | 'disable'
  disabledReason?: string
}

export function PermissionGate({
  allowedRoles,
  children,
  fallback = 'hide',
  disabledReason = 'You do not have permission for this action.',
}: PermissionGateProps) {
  const activeRole = useAuthStore((s) => s.activeRole)

  if (!activeRole || !allowedRoles.includes(activeRole)) {
    if (fallback === 'hide') return null

    return (
      <Tooltip content={disabledReason}>
        <div className="opacity-50 pointer-events-none select-none" aria-disabled="true">
          {children}
        </div>
      </Tooltip>
    )
  }

  return <>{children}</>
}

export function useHasPermission(allowedRoles: Role[]): boolean {
  const activeRole = useAuthStore((s) => s.activeRole)
  return activeRole !== null && allowedRoles.includes(activeRole)
}
