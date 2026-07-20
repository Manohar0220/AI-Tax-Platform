import { create } from 'zustand'
import type { Role, User } from '@/domain/types'

export type Workspace = 'firm' | 'personal'

interface AuthState {
  currentUser: User | null
  activeRole: Role | null
  activeWorkspace: Workspace
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  switchWorkspace: (workspace: Workspace) => void
  getActiveRole: () => Role | null
}

const STORAGE_KEY = 'ledgerbridge-auth'

interface PersistedAuth {
  userId: string
  activeWorkspace: Workspace
}

function loadPersistedAuth(): PersistedAuth | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return null
}

function persistAuth(userId: string, workspace: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, activeWorkspace: workspace }))
}

function clearPersistedAuth(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getHomeRouteForRole(role: Role): string {
  switch (role) {
    case 'individual_taxpayer':
      return '/my-return'
    case 'business_owner':
      return '/my-return'
    case 'tax_preparer':
      return '/dashboard'
    case 'reviewer':
      return '/dashboard'
    case 'firm_administrator':
      return '/admin'
    default:
      return '/dashboard'
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  activeRole: null,
  activeWorkspace: 'firm',
  isAuthenticated: false,

  login: (user: User) => {
    const workspace: Workspace = user.primaryRole === 'tax_preparer' ? 'firm' : 'firm'
    set({
      currentUser: user,
      activeRole: user.primaryRole,
      activeWorkspace: workspace,
      isAuthenticated: true,
    })
    persistAuth(user.id, workspace)
  },

  logout: () => {
    set({
      currentUser: null,
      activeRole: null,
      activeWorkspace: 'firm',
      isAuthenticated: false,
    })
    clearPersistedAuth()
  },

  switchWorkspace: (workspace: Workspace) => {
    const user = get().currentUser
    if (!user) return

    const role: Role = workspace === 'personal'
      ? 'individual_taxpayer'
      : user.primaryRole

    set({ activeWorkspace: workspace, activeRole: role })
    persistAuth(user.id, workspace)
  },

  getActiveRole: () => {
    return get().activeRole
  },
}))

export function getPersistedAuth(): PersistedAuth | null {
  return loadPersistedAuth()
}
