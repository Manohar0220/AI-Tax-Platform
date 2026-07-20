import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { isManagedClientUser } from '@/services/managed-returns'
import { getNavForRole } from './nav-config'
import { cn } from '@/utils/cn'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const activeRole = useAuthStore((s) => s.activeRole)
  const currentUser = useAuthStore((s) => s.currentUser)
  const onboardingCompleted = useOnboardingStore((s) => s.completed)
  // Only the two demo clients (Manohar, Alex) are gated behind onboarding.
  const effectiveCompleted = onboardingCompleted || !isManagedClientUser(currentUser?.id)
  const navItems = activeRole ? getNavForRole(activeRole, effectiveCompleted) : []

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-surface-overlay z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-14 left-0 bottom-0 w-60 bg-surface-card border-r border-border-default z-40',
          'flex flex-col transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between p-3 lg:hidden border-b border-border-default">
          <span className="text-sm font-medium text-text-primary">Navigation</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:bg-neutral-100"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    end={item.path === '/my-return' || item.path === '/admin'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary'
                      )
                    }
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
