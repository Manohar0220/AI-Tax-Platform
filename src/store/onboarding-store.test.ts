import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboardingStore } from './onboarding-store'

const TEST_USER = 'user-sarah'

describe('Onboarding Store (per-user)', () => {
  beforeEach(() => {
    localStorage.clear()
    useOnboardingStore.getState().loadForUser(TEST_USER)
  })

  it('starts at section 0 with no answers after loadForUser', () => {
    const state = useOnboardingStore.getState()
    expect(state.currentSection).toBe(0)
    expect(state.answers).toEqual({})
    expect(state.status).toBe('not_started')
    expect(state.completed).toBe(false)
  })

  it('setAnswer saves individual answers and moves to in_progress', () => {
    useOnboardingStore.getState().setAnswer('filingStatus', 'single')
    const state = useOnboardingStore.getState()
    expect(state.answers.filingStatus).toBe('single')
    expect(state.status).toBe('in_progress')
  })

  it('setAnswer persists to user-specific localStorage key', () => {
    useOnboardingStore.getState().setAnswer('hasW2Employment', true)
    const stored = JSON.parse(localStorage.getItem(`ledgerbridge-onboarding-${TEST_USER}`)!)
    expect(stored.answers.hasW2Employment).toBe(true)
  })

  it('setSection advances and persists', () => {
    useOnboardingStore.getState().setSection(2)
    expect(useOnboardingStore.getState().currentSection).toBe(2)
    const stored = JSON.parse(localStorage.getItem(`ledgerbridge-onboarding-${TEST_USER}`)!)
    expect(stored.currentSection).toBe(2)
  })

  it('completeOnboarding marks status completed', () => {
    useOnboardingStore.getState().completeOnboarding()
    expect(useOnboardingStore.getState().status).toBe('completed')
    expect(useOnboardingStore.getState().completed).toBe(true)
  })

  it('reset clears all state for the current user', () => {
    useOnboardingStore.getState().setAnswer('filingStatus', 'married_jointly')
    useOnboardingStore.getState().setSection(4)
    useOnboardingStore.getState().reset()
    const state = useOnboardingStore.getState()
    expect(state.currentSection).toBe(0)
    expect(state.answers).toEqual({})
    expect(state.status).toBe('not_started')
    expect(state.completed).toBe(false)
  })

  it('different users have isolated state', () => {
    useOnboardingStore.getState().setAnswer('filingStatus', 'single')
    // Switch to a different user — state should reset.
    useOnboardingStore.getState().loadForUser('user-alex')
    expect(useOnboardingStore.getState().answers.filingStatus).toBeUndefined()
    // Switch back — original user's data is restored.
    useOnboardingStore.getState().loadForUser(TEST_USER)
    expect(useOnboardingStore.getState().answers.filingStatus).toBe('single')
  })

  it('conditional question: ownsHome + hasMortgage', () => {
    useOnboardingStore.getState().setAnswer('homeAction', 'refinanced')
    expect(useOnboardingStore.getState().answers.homeAction).toBe('refinanced')
    useOnboardingStore.getState().setAnswer('hasMortgage', true)
    expect(useOnboardingStore.getState().answers.hasMortgage).toBe(true)
  })
})
