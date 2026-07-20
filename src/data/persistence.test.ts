import { describe, it, expect, beforeEach } from 'vitest'
import { loadDemoState, saveDemoState, resetDemoState, hasSavedState } from './persistence'
import { createSeedState } from './seed'

describe('Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns seed state when no saved state exists', () => {
    const state = loadDemoState()
    expect(state.users).toHaveLength(8)
    expect(state.returns.length).toBeGreaterThan(3)
  })

  it('persists state to localStorage', () => {
    const state = createSeedState()
    saveDemoState(state)
    expect(hasSavedState()).toBe(true)
  })

  it('loads persisted state on subsequent call', () => {
    const state = createSeedState()
    state.users[0] = { ...state.users[0], name: 'Modified Name' }
    saveDemoState(state)

    const loaded = loadDemoState()
    expect(loaded.users[0].name).toBe('Modified Name')
  })

  it('reset restores original seed state', () => {
    const state = createSeedState()
    state.users[0] = { ...state.users[0], name: 'Modified Name' }
    saveDemoState(state)

    const reset = resetDemoState()
    expect(reset.users[0].name).toBe('Manohar')
  })

  it('hasSavedState returns false before any save', () => {
    expect(hasSavedState()).toBe(false)
  })

  it('hasSavedState returns true after save', () => {
    saveDemoState(createSeedState())
    expect(hasSavedState()).toBe(true)
  })

  it('seed state includes all five named demo users (plus firm staff)', () => {
    const state = createSeedState()
    // Five named personas + three additional firm staff for assignment demos.
    expect(state.users).toHaveLength(8)
    expect(state.users.map((u) => u.name)).toContain('Manohar')
    expect(state.users.map((u) => u.name)).toContain('Alex Rivera')
    expect(state.users.map((u) => u.name)).toContain('Maya Patel')
    expect(state.users.map((u) => u.name)).toContain('Daniel Kim')
    expect(state.users.map((u) => u.name)).toContain('Priya Shah')
    expect(state.users.map((u) => u.name)).not.toContain('Ben Carter')
  })

  it('seed state includes three detailed returns', () => {
    const state = createSeedState()
    const detailedIds = state.returns.map((r) => r.id)
    expect(detailedIds).toContain('RET-1001')
    expect(detailedIds).toContain('RET-2001')
    expect(detailedIds).toContain('RET-3001')
  })

  it('seed state includes generated scale data', () => {
    const state = createSeedState()
    expect(state.returns.length).toBe(3 + 80)
    expect(state.documents.length).toBe(24 + 250)
    expect(state.tasks.length).toBe(8 + 180)
    expect(state.requests.length).toBe(3 + 90)
    expect(state.recommendations.length).toBe(9 + 60)
  })

  it('seed state is deterministic', () => {
    const first = createSeedState()
    const second = createSeedState()
    expect(first).toEqual(second)
  })
})
