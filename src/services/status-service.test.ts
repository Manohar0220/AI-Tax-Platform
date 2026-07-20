import { describe, it, expect, beforeEach } from 'vitest'
import {
  canTransition,
  getValidNextStages,
  transitionStage,
  recordStageChange,
  getStatusDescriptor,
  VALID_TRANSITIONS,
  STAGE_ORDER,
} from './status-service'
import { useDemoStore } from '@/store/demo-store'
import { createSeedState } from '@/data/seed'
import type { ReturnStage, TaxReturn } from '@/domain/types'

function state() { return useDemoStore.getState() }
function ret(id: string) { return state().returns.find((r) => r.id === id)! }

describe('status-service — valid transitions', () => {
  it('allows the documented transitions', () => {
    expect(canTransition('collecting_information', 'ready_to_prepare')).toBe(true)
    expect(canTransition('ready_to_prepare', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'ready_for_review')).toBe(true)
    expect(canTransition('ready_for_review', 'under_review')).toBe(true)
    expect(canTransition('under_review', 'changes_requested')).toBe(true)
    expect(canTransition('under_review', 'waiting_for_client_approval')).toBe(true)
    expect(canTransition('changes_requested', 'preparing')).toBe(true)
    expect(canTransition('changes_requested', 'under_review')).toBe(true)
    expect(canTransition('waiting_for_client_approval', 'ready_to_file')).toBe(true)
    expect(canTransition('ready_to_file', 'filed')).toBe(true)
    expect(canTransition('ready_to_file', 'filing_rejected')).toBe(true)
    expect(canTransition('filing_rejected', 'preparing')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransition('collecting_information', 'filed')).toBe(false)
    expect(canTransition('preparing', 'filed')).toBe(false)
    expect(canTransition('filed', 'preparing')).toBe(false)
    expect(canTransition('waiting_for_client_approval', 'filed')).toBe(false)
    expect(canTransition('ready_for_review', 'waiting_for_client_approval')).toBe(false)
  })

  it('filed is terminal', () => {
    expect(getValidNextStages('filed')).toHaveLength(0)
  })

  it('every stage has an entry in the transition table', () => {
    STAGE_ORDER.forEach((s) => expect(VALID_TRANSITIONS[s as ReturnStage]).toBeDefined())
  })
})

describe('status-service — transitionStage enforcement', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('performs a valid transition and records history + audit with reason', () => {
    // RET-1001 starts at collecting_information.
    const beforeAudit = state().auditEvents.length
    transitionStage('RET-1001', 'ready_to_prepare', 'user-maya', 'All documents received')
    const r = ret('RET-1001')
    expect(r.stage).toBe('ready_to_prepare')
    const last = r.stageHistory.at(-1)!
    expect(last.stage).toBe('ready_to_prepare')
    expect(last.reason).toBe('All documents received')
    // Previous entry is now completed by the user.
    const prev = r.stageHistory.at(-2)!
    expect(prev.completedBy).toBe('user-maya')
    expect(state().auditEvents.length).toBe(beforeAudit + 1)
    expect(state().auditEvents.at(-1)!.action).toBe('stage_changed')
  })

  it('throws on an invalid transition and leaves the stage unchanged', () => {
    expect(() => transitionStage('RET-1001', 'filed', 'user-maya', 'nope')).toThrow(/invalid transition/i)
    expect(ret('RET-1001').stage).toBe('collecting_information')
  })

  it('updates next action and responsible role from stage defaults', () => {
    transitionStage('RET-1001', 'ready_to_prepare', 'user-maya', 'ready')
    expect(ret('RET-1001').nextResponsibleRole).toBe('tax_preparer')
  })
})

describe('status-service — descriptor differs by audience', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  function build(taxReturn: TaxReturn, audience: 'client' | 'staff') {
    return getStatusDescriptor(taxReturn, audience, state().users, state().clients)
  }

  it('same underlying stage, different wording per audience', () => {
    const r = ret('RET-1001')
    const client = build(r, 'client')
    const staff = build(r, 'staff')
    expect(client.stage).toBe(staff.stage) // same underlying status
    expect(client.label).not.toBe(staff.label) // different detail
  })

  it('staff wording is operational and includes the deadline', () => {
    const r = ret('RET-2001')
    const staff = build(r, 'staff')
    expect(staff.showDeadline).toBe(true)
    expect(staff.nextActionText).toContain('due')
  })

  it('always exposes blocker and next responsible person', () => {
    const r = ret('RET-1001') // has a blocker in the seed
    const staff = build(r, 'staff')
    expect(staff.blocker).toBeTruthy()
    expect(staff.nextResponsiblePerson.length).toBeGreaterThan(0)
  })

  it('records completed steps after a couple of transitions', () => {
    recordStageChange('RET-1001', 'ready_to_prepare', 'user-maya', 'ready')
    recordStageChange('RET-1001', 'preparing', 'user-maya', 'starting')
    const staff = build(ret('RET-1001'), 'staff')
    expect(staff.completedStepLabels.length).toBeGreaterThanOrEqual(2)
  })
})
