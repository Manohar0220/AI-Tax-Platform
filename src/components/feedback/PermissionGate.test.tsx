import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { PermissionGate } from './PermissionGate'
import { useAuthStore } from '@/store/auth-store'
import { DEMO_USERS } from '@/data/users'

describe('PermissionGate', () => {
  beforeEach(() => {
    useAuthStore.setState({
      currentUser: null,
      activeRole: null,
      activeWorkspace: 'firm',
      isAuthenticated: false,
    })
  })

  it('hides children when user has no role', () => {
    render(
      <PermissionGate allowedRoles={['tax_preparer']}>
        <button>Secret button</button>
      </PermissionGate>
    )
    expect(screen.queryByText('Secret button')).not.toBeInTheDocument()
  })

  it('hides children when role is not allowed', () => {
    const sarah = DEMO_USERS.find((u) => u.id === 'user-sarah')!
    useAuthStore.getState().login(sarah)

    render(
      <PermissionGate allowedRoles={['tax_preparer', 'reviewer']}>
        <button>Staff only button</button>
      </PermissionGate>
    )
    expect(screen.queryByText('Staff only button')).not.toBeInTheDocument()
  })

  it('shows children when role is allowed', () => {
    const maya = DEMO_USERS.find((u) => u.id === 'user-maya')!
    useAuthStore.getState().login(maya)

    render(
      <PermissionGate allowedRoles={['tax_preparer', 'reviewer']}>
        <button>Staff only button</button>
      </PermissionGate>
    )
    expect(screen.getByText('Staff only button')).toBeInTheDocument()
  })

  it('shows disabled state with fallback=disable', () => {
    const sarah = DEMO_USERS.find((u) => u.id === 'user-sarah')!
    useAuthStore.getState().login(sarah)

    render(
      <PermissionGate
        allowedRoles={['tax_preparer']}
        fallback="disable"
        disabledReason="Only preparers can do this."
      >
        <button>Edit field</button>
      </PermissionGate>
    )
    const wrapper = screen.getByText('Edit field').parentElement
    expect(wrapper).toHaveAttribute('aria-disabled', 'true')
  })

  it('updates immediately when role switches', () => {
    const maya = DEMO_USERS.find((u) => u.id === 'user-maya')!
    useAuthStore.getState().login(maya)

    const { rerender } = render(
      <PermissionGate allowedRoles={['tax_preparer']}>
        <button>Preparer action</button>
      </PermissionGate>
    )
    expect(screen.getByText('Preparer action')).toBeInTheDocument()

    useAuthStore.getState().switchWorkspace('personal')

    rerender(
      <PermissionGate allowedRoles={['tax_preparer']}>
        <button>Preparer action</button>
      </PermissionGate>
    )
    expect(screen.queryByText('Preparer action')).not.toBeInTheDocument()
  })

  it('allows multiple roles', () => {
    const daniel = DEMO_USERS.find((u) => u.id === 'user-daniel')!
    useAuthStore.getState().login(daniel)

    render(
      <PermissionGate allowedRoles={['tax_preparer', 'reviewer', 'firm_administrator']}>
        <button>Review action</button>
      </PermissionGate>
    )
    expect(screen.getByText('Review action')).toBeInTheDocument()
  })
})
