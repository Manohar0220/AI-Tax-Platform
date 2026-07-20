import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, getHomeRouteForRole } from './auth-store'
import { DEMO_USERS } from '@/data/users'

describe('Auth Store', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      currentUser: null,
      activeRole: null,
      activeWorkspace: 'firm',
      isAuthenticated: false,
    })
  })

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.currentUser).toBe(null)
  })

  it('login sets user and role', () => {
    const sarah = DEMO_USERS[0]
    useAuthStore.getState().login(sarah)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.currentUser?.name).toBe('Manohar')
    expect(state.activeRole).toBe('individual_taxpayer')
  })

  it('login persists to localStorage', () => {
    const sarah = DEMO_USERS[0]
    useAuthStore.getState().login(sarah)

    const stored = JSON.parse(localStorage.getItem('ledgerbridge-auth')!)
    expect(stored.userId).toBe('user-sarah')
  })

  it('logout clears state', () => {
    const sarah = DEMO_USERS[0]
    useAuthStore.getState().login(sarah)
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.currentUser).toBe(null)
    expect(localStorage.getItem('ledgerbridge-auth')).toBe(null)
  })

  it('Maya can switch to personal workspace', () => {
    const maya = DEMO_USERS.find((u) => u.id === 'user-maya')!
    useAuthStore.getState().login(maya)
    useAuthStore.getState().switchWorkspace('personal')

    const state = useAuthStore.getState()
    expect(state.activeWorkspace).toBe('personal')
    expect(state.activeRole).toBe('individual_taxpayer')
  })

  it('Maya can switch back to firm workspace', () => {
    const maya = DEMO_USERS.find((u) => u.id === 'user-maya')!
    useAuthStore.getState().login(maya)
    useAuthStore.getState().switchWorkspace('personal')
    useAuthStore.getState().switchWorkspace('firm')

    const state = useAuthStore.getState()
    expect(state.activeWorkspace).toBe('firm')
    expect(state.activeRole).toBe('tax_preparer')
  })

  it('workspace switch persists', () => {
    const maya = DEMO_USERS.find((u) => u.id === 'user-maya')!
    useAuthStore.getState().login(maya)
    useAuthStore.getState().switchWorkspace('personal')

    const stored = JSON.parse(localStorage.getItem('ledgerbridge-auth')!)
    expect(stored.activeWorkspace).toBe('personal')
  })

  it('returns correct home route for each role', () => {
    expect(getHomeRouteForRole('individual_taxpayer')).toBe('/my-return')
    expect(getHomeRouteForRole('business_owner')).toBe('/my-return')
    expect(getHomeRouteForRole('tax_preparer')).toBe('/dashboard')
    expect(getHomeRouteForRole('reviewer')).toBe('/dashboard')
    expect(getHomeRouteForRole('firm_administrator')).toBe('/admin')
  })

  it('all five demo users can log in', () => {
    DEMO_USERS.forEach((user) => {
      useAuthStore.getState().login(user)
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.currentUser?.id).toBe(user.id)
      expect(state.activeRole).toBe(user.primaryRole)
    })
  })
})
