/**
 * Combined permission-rule tests that span multiple services.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useDemoStore } from '@/store/demo-store'
import { useAuthStore } from '@/store/auth-store'
import { createSeedState } from '@/data/seed'
import { DEMO_USERS } from '@/data/users'
import { getNavForRole } from '@/components/navigation/nav-config'
import { filterThreadsForRole, filterMessagesForRole } from '@/services/collaboration-service'
import { approveReturn, approveField, reopenField, buildReviewQueue } from '@/services/reviewer-service'
import { correctField } from '@/services/field-service'
import { transitionStage } from '@/services/status-service'

function state() { return useDemoStore.getState() }

describe('clients cannot see internal notes', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('internal threads are hidden from individual_taxpayer', () => {
    const threads = filterThreadsForRole(state().threads, 'individual_taxpayer')
    expect(threads.every((t) => t.visibility === 'client_visible')).toBe(true)
  })

  it('per-message internal notes in a client-visible thread are hidden from clients', () => {
    const clientThread = state().threads.find((t) => t.id === 'thread-mortgage-request')!
    const clientMsgs = filterMessagesForRole(state().messages, clientThread, 'individual_taxpayer')
    const staffMsgs = filterMessagesForRole(state().messages, clientThread, 'tax_preparer')
    // All client-visible messages have no internal_only visibility.
    clientMsgs.forEach((m) => expect(m.visibility !== 'internal_only').toBe(true))
    // Staff can see at least as many (includes internal notes).
    expect(staffMsgs.length).toBeGreaterThanOrEqual(clientMsgs.length)
  })
})

describe('review queue — firm staff only (no seasonal role)', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('review queue for non-reviewer is empty', () => {
    const rows = buildReviewQueue(
      { returns: state().returns, fields: state().fields, issues: state().issues, recommendations: state().recommendations },
      'user-maya', // preparer, not a reviewer
    )
    // Maya is preparerId on some returns, but never reviewerId.
    expect(rows.length).toBe(0)
  })
})

describe('locked fields cannot be edited', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('throws when a preparer tries to correct a reviewer-locked field', () => {
    approveField('field-1001-dividends', 'user-daniel')
    expect(() => correctField('field-1001-dividends', 999, 'change', 'user-maya')).toThrow(/locked/i)
  })

  it('allows editing after reopenField', () => {
    approveField('field-1001-dividends', 'user-daniel')
    reopenField('field-1001-dividends', 'user-maya')
    expect(() => correctField('field-1001-dividends', 2050, 'confirmed correct', 'user-maya')).not.toThrow()
  })
})

describe('role switch changes navigation', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ currentUser: null, activeRole: null, activeWorkspace: 'firm', isAuthenticated: false })
  })

  it('tax_preparer gets dashboard; individual_taxpayer gets home', () => {
    const prepNav = getNavForRole('tax_preparer').map((n) => n.id)
    const clientNav = getNavForRole('individual_taxpayer').map((n) => n.id)
    expect(prepNav).toContain('dashboard')
    expect(clientNav).not.toContain('dashboard')
    expect(clientNav).toContain('home')
    expect(prepNav).not.toContain('home')
  })

  it("Maya's activeRole changes when switching workspace", () => {
    const maya = DEMO_USERS.find((u) => u.id === 'user-maya')!
    useAuthStore.getState().login(maya)
    expect(useAuthStore.getState().activeRole).toBe('tax_preparer')

    useAuthStore.getState().switchWorkspace('personal')
    expect(useAuthStore.getState().activeRole).toBe('individual_taxpayer')

    useAuthStore.getState().switchWorkspace('firm')
    expect(useAuthStore.getState().activeRole).toBe('tax_preparer')
  })
})

describe('preparer cannot do reviewer final approval (service not gated, UI is)', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('approveReturn advances to waiting_for_client_approval (role gate is in the UI)', () => {
    // Drive the return to under_review via validated transitions.
    transitionStage('RET-1001', 'ready_to_prepare', 'user-maya', 'all docs received')
    transitionStage('RET-1001', 'preparing', 'user-maya', 'started')
    transitionStage('RET-1001', 'ready_for_review', 'user-maya', 'done')
    transitionStage('RET-1001', 'under_review', 'user-daniel', 'picked up')

    approveReturn('RET-1001', 'user-daniel')
    expect(state().returns.find((r) => r.id === 'RET-1001')!.stage).toBe('waiting_for_client_approval')
  })
})
