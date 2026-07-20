import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { isManagedClientUser } from '@/services/managed-returns'
import { getNavForRole } from './nav-config'
import { cn } from '@/utils/cn'

export function MobileBottomNav() {
  const activeRole = useAuthStore((s) => s.activeRole)
  const currentUser = useAuthStore((s) => s.currentUser)
  const onboardingCompleted = useOnboardingStore((s) => s.completed)
  const effectiveCompleted = onboardingCompleted || !isManagedClientUser(currentUser?.id)
  const navItems = activeRole ? getNavForRole(activeRole, effectiveCompleted).slice(0, 5) : []

  if (navItems.length === 0) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-border-default z-40 lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.id}>
              <NavLink
                to={item.path}
                end={item.path === '/my-return' || item.path === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-xs transition-colors',
                    isActive
                      ? 'text-primary-700 font-medium'
                      : 'text-text-muted'
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate max-w-[4.5rem]">{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
