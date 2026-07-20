import { describe, it, expect } from 'vitest'
import {
  computePriority,
  rankReturns,
  computeSummary,
  daysBetween,
  DEMO_TODAY,
} from './priority-service'
import { generateReturns } from '@/data/generator'
import type { TaxReturn, Issue } from '@/domain/types'

function makeReturn(overrides: Partial<TaxReturn> = {}): TaxReturn {
  return {
    id: 'RET-TEST',
    clientId: 'client-x',
    type: 'individual',
    taxYear: 2025,
    stage: 'preparing',
    preparerId: 'user-maya',
    reviewerId: 'user-daniel',
    deadline: '2026-06-15',
    priority: 'medium',
    riskLevel: 'low',
    blocker: null,
    nextAction: 'Continue',
    nextResponsibleRole: 'tax_preparer',
    completionPercentage: 50,
    stageHistory: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('priority-service — daysBetween', () => {
  it('computes positive and negative day spans', () => {
    expect(daysBetween('2026-03-20', '2026-03-22')).toBe(2)
    expect(daysBetween('2026-03-20', '2026-03-15')).toBe(-5)
    expect(daysBetween('2026-03-20', '2026-03-20')).toBe(0)
  })
})

describe('priority-service — computePriority explanations', () => {
  it('always returns at least one reason', () => {
    const result = computePriority(makeReturn())
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.topReason).toBeTruthy()
  })

  it('ranks a filing rejection as the top reason', () => {
    const result = computePriority(makeReturn({ stage: 'filing_rejected' }))
    expect(result.topReason).toBe('Filing rejected')
    expect(result.topKind).toBe('rejection')
  })

  it('flags overdue returns with a day count', () => {
    const result = computePriority(makeReturn({ deadline: '2026-03-13' }), { today: DEMO_TODAY })
    expect(result.topKind).toBe('overdue')
    expect(result.topReason).toContain('Overdue by 7 days')
  })

  it('flags due-soon returns', () => {
    const result = computePriority(makeReturn({ deadline: '2026-03-22' }), { today: DEMO_TODAY })
    expect(result.reasons.some((r) => r.kind === 'deadline')).toBe(true)
    expect(result.reasons.some((r) => r.label === 'Due in 2 days')).toBe(true)
  })

  it('explains reviewer change requests', () => {
    const result = computePriority(makeReturn({ stage: 'changes_requested' }))
    expect(result.reasons.some((r) => r.kind === 'review')).toBe(true)
  })

  it('explains a blocking issue', () => {
    const result = computePriority(makeReturn({ blocker: 'Missing mortgage statement' }))
    expect(result.reasons.some((r) => r.kind === 'blocker' && r.label.includes('Missing mortgage statement'))).toBe(true)
  })

  it('raises priority for a high-risk open issue', () => {
    const issues: Issue[] = [{
      id: 'i1', returnId: 'RET-TEST', title: 'Equipment business-use unclear',
      description: '', status: 'open', priority: 'high', assignedTo: 'user-maya',
      createdBy: 'user-daniel', createdAt: '2026-01-01T00:00:00Z', resolvedAt: null,
    }]
    const withIssue = computePriority(makeReturn(), { issues })
    const without = computePriority(makeReturn())
    expect(withIssue.score).toBeGreaterThan(without.score)
    expect(withIssue.reasons.some((r) => r.kind === 'risk')).toBe(true)
  })

  it('does not surface deadline pressure for filed returns', () => {
    const result = computePriority(makeReturn({ stage: 'filed', deadline: '2026-03-13' }), { today: DEMO_TODAY })
    expect(result.reasons.some((r) => r.kind === 'overdue')).toBe(false)
  })
})

describe('priority-service — relative ranking', () => {
  it('overdue outranks due-soon which outranks on-track', () => {
    const overdue = computePriority(makeReturn({ deadline: '2026-03-10' }), { today: DEMO_TODAY })
    const dueSoon = computePriority(makeReturn({ deadline: '2026-03-25' }), { today: DEMO_TODAY })
    const onTrack = computePriority(makeReturn({ deadline: '2026-08-01' }), { today: DEMO_TODAY })
    expect(overdue.score).toBeGreaterThan(dueSoon.score)
    expect(dueSoon.score).toBeGreaterThan(onTrack.score)
  })

  it('rankReturns sorts most urgent first and is not input order', () => {
    const list = [
      makeReturn({ id: 'A', deadline: '2026-08-01' }),
      makeReturn({ id: 'B', stage: 'filing_rejected' }),
      makeReturn({ id: 'C', deadline: '2026-03-10' }),
    ]
    const ranked = rankReturns(list, { today: DEMO_TODAY })
    expect(ranked[0].ret.id).toBe('B')
    expect(ranked[ranked.length - 1].ret.id).toBe('A')
  })

  it('is deterministic for the same input', () => {
    const list = generateReturns(80)
    const a = rankReturns(list, { today: DEMO_TODAY }).map((r) => r.ret.id)
    const b = rankReturns(list, { today: DEMO_TODAY }).map((r) => r.ret.id)
    expect(a).toEqual(b)
  })

  it('handles the full generated dataset and explains every entry', () => {
    const list = generateReturns(80)
    const ranked = rankReturns(list, { today: DEMO_TODAY })
    expect(ranked.length).toBe(80)
    expect(ranked.every((r) => r.priority.topReason.length > 0)).toBe(true)
  })
})

describe('priority-service — summary counts', () => {
  it('counts blocked, waiting, and high-risk returns', () => {
    const list = [
      makeReturn({ id: '1', blocker: 'x' }),
      makeReturn({ id: '2', stage: 'waiting_on_client' }),
      makeReturn({ id: '3', riskLevel: 'high' }),
      makeReturn({ id: '4', stage: 'ready_to_prepare' }),
      makeReturn({ id: '5', stage: 'ready_for_review' }),
      makeReturn({ id: '6', deadline: '2026-03-25' }),
    ]
    const s = computeSummary(list, DEMO_TODAY)
    expect(s.blocked).toBe(1)
    expect(s.waitingOnClient).toBe(1)
    expect(s.highRisk).toBe(1)
    expect(s.readyForPrep).toBe(1)
    expect(s.readyForReview).toBe(1)
    expect(s.dueSoon).toBeGreaterThanOrEqual(1)
  })
})
