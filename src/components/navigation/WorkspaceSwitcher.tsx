import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Building2, User, LogOut } from 'lucide-react'
import { useAuthStore, getHomeRouteForRole, type Workspace } from '@/store/auth-store'
import { cn } from '@/utils/cn'
import type { Role } from '@/domain/types'

const ROLE_LABELS: Record<Role, string> = {
  individual_taxpayer: 'Individual Taxpayer',
  business_owner: 'Business Owner',
  tax_preparer: 'Tax Preparer',
  reviewer: 'Reviewer',
  firm_administrator: 'Firm Administrator',
}

export function WorkspaceSwitcher() {
  const navigate = useNavigate()
  const { currentUser, activeRole, activeWorkspace, switchWorkspace, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  if (!currentUser || !activeRole) return null

  const hasDualRole = currentUser.roles.length > 1
  const workspaceLabel = activeWorkspace === 'personal'
    ? 'My Personal Return'
    : ROLE_LABELS[activeRole]

  const handleSwitch = (workspace: Workspace) => {
    switchWorkspace(workspace)
    setOpen(false)
    const role: Role = workspace === 'personal' ? 'individual_taxpayer' : currentUser.primaryRole
    navigate(getHomeRouteForRole(role))
  }

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/login')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-100 transition-colors"
        aria-label="Workspace switcher"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
          {currentUser.avatarInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-text-primary leading-tight">
            {currentUser.name}
          </p>
          <p className="text-xs text-text-muted leading-tight">
            {workspaceLabel}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-64 bg-surface-card border border-border-default rounded-lg shadow-lg z-50 py-1"
          role="menu"
        >
          {hasDualRole && (
            <>
              <p className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
                Workspace
              </p>
              <button
                role="menuitem"
                onClick={() => handleSwitch('firm')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-neutral-50',
                  activeWorkspace === 'firm' && 'bg-primary-50'
                )}
              >
                <Building2 className="h-4 w-4 text-text-muted" />
                <div>
                  <p className="font-medium text-text-primary">Firm Workspace</p>
                  <p className="text-xs text-text-muted">{ROLE_LABELS[currentUser.primaryRole]}</p>
                </div>
                {activeWorkspace === 'firm' && (
                  <span className="ml-auto text-xs text-primary-600 font-medium">Active</span>
                )}
              </button>
              <button
                role="menuitem"
                onClick={() => handleSwitch('personal')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-neutral-50',
                  activeWorkspace === 'personal' && 'bg-primary-50'
                )}
              >
                <User className="h-4 w-4 text-text-muted" />
                <div>
                  <p className="font-medium text-text-primary">My Personal Return</p>
                  <p className="text-xs text-text-muted">Individual Taxpayer</p>
                </div>
                {activeWorkspace === 'personal' && (
                  <span className="ml-auto text-xs text-primary-600 font-medium">Active</span>
                )}
              </button>
              <div className="border-t border-border-default my-1" />
            </>
          )}

          {!hasDualRole && (
            <>
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-text-primary">{currentUser.name}</p>
                <p className="text-xs text-text-muted">{ROLE_LABELS[activeRole]}</p>
              </div>
              <div className="border-t border-border-default my-1" />
            </>
          )}

          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-neutral-50 text-text-secondary"
          >
            <LogOut className="h-4 w-4" />
            Switch demo user
          </button>
        </div>
      )}
    </div>
  )
}
