import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStaffWorkload,
  getFirmOverview,
  reassignPreparer,
  reassignReviewer,
  isOverloaded,
  ROLE_CAPACITY,
} from './admin-service'
import { useDemoStore } from '@/store/demo-store'
import { createSeedState } from '@/data/seed'

function state() { return useDemoStore.getState() }
function ret(id: string) { return state().returns.find((r) => r.id === id)! }
function user(id: string) { return state().users.find((u) => u.id === id)! }

describe('admin-service — workload', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('computes load, capacity and status per staff', () => {
    const wl = getStaffWorkload(state().users, state().returns)
    expect(wl.length).toBeGreaterThan(0)
    const maya = wl.find((w) => w.user.id === 'user-maya')!
    expect(maya.capacity).toBe(ROLE_CAPACITY.tax_preparer)
    expect(maya.load).toBeGreaterThan(0)
    // Maya carries most generated returns, so she is overloaded.
    expect(maya.status).toBe('overloaded')
  })

  it('detects overload including a prospective extra assignment', () => {
    const maya = user('user-maya')
    expect(isOverloaded(maya, state().returns)).toBe(true)
  })
})

describe('admin-service — firm overview', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('summarizes stages, blocked, deadlines and assignment flags', () => {
    const o = getFirmOverview(state().returns, state().users)
    expect(o.returnsByStage.reduce((s, x) => s + x.count, 0)).toBeGreaterThan(0)
    expect(o.blocked.length).toBeGreaterThan(0) // RET-1001 / RET-2001 have blockers
    // Some generated returns may be missing a preparer assignment.
    expect(o.workload.some((w) => w.user.id === 'user-maya')).toBe(true)
  })
})

describe('admin-service — reassignment updates workload', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('moving a return off Maya reduces her load and increases the new preparer\'s', () => {
    const before = getStaffWorkload(state().users, state().returns)
    const mayaBefore = before.find((w) => w.user.id === 'user-maya')!.load
    const ninaBefore = before.find((w) => w.user.id === 'user-nina')!.load

    // Find an active return currently assigned to Maya.
    const target = state().returns.find((r) => r.preparerId === 'user-maya' && r.stage !== 'filed')!
    reassignPreparer(target.id, 'user-nina', 'user-priya')

    expect(ret(target.id).preparerId).toBe('user-nina')
    const after = getStaffWorkload(state().users, state().returns)
    expect(after.find((w) => w.user.id === 'user-maya')!.load).toBe(mayaBefore - 1)
    expect(after.find((w) => w.user.id === 'user-nina')!.load).toBe(ninaBefore + 1)
  })

  it('reassigns a reviewer', () => {
    reassignReviewer('RET-1001', 'user-grace', 'user-priya')
    expect(ret('RET-1001').reviewerId).toBe('user-grace')
  })
})
