import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/forms'
import { useAuthStore, getHomeRouteForRole } from '@/store/auth-store'

export function PermissionDeniedPage() {
  const navigate = useNavigate()
  const activeRole = useAuthStore((s) => s.activeRole)

  const homeRoute = activeRole ? getHomeRouteForRole(activeRole) : '/login'

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-neutral-400">
        <ShieldX className="h-12 w-12" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold text-text-primary mb-2">
        You don't have access to this page
      </h1>
      <p className="text-sm text-text-muted max-w-sm mb-6">
        Your current role does not include permission to view this section.
        If you need access, contact your firm administrator.
      </p>
      <Button onClick={() => navigate(homeRoute)}>
        Return to home
      </Button>
    </div>
  )
}
