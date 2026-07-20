import { describe, it, expect, beforeEach } from 'vitest'
import {
  confidenceLabel,
  acceptRecommendation,
  dismissRecommendation,
  escalateRecommendation,
  askClientAboutRecommendation,
  undoRecommendation,
  canUndo,
} from './ai-service'
import { correctField } from './field-service'
import { useDemoStore } from '@/store/demo-store'
import { createSeedState } from '@/data/seed'

const WAGE_REC = 'ai-rec-acme-wage-mismatch'
const EQUIP_REC = 'ai-rec-equipment-use'
const DUP_REC = 'ai-rec-duplicate-w2'

function rec(id: string) {
  return useDemoStore.getState().recommendations.find((r) => r.id === id)!
}
function auditCount() {
  return useDemoStore.getState().auditEvents.length
}

describe('ai-service — certainty labels', () => {
  it('uses plain-language labels', () => {
    expect(confidenceLabel('high')).toBe('High confidence')
    expect(confidenceLabel('medium')).toBe('Needs review')
    expect(confidenceLabel('low')).toBe('Low confidence')
  })
})

describe('ai-service — actions record audit and update state', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('accepts a recommendation and writes an audit event', () => {
    const before = auditCount()
    acceptRecommendation(DUP_REC, 'user-maya')
    expect(rec(DUP_REC).status).toBe('accepted')
    expect(rec(DUP_REC).actedBy).toBe('user-maya')
    expect(auditCount()).toBe(before + 1)
    const last = useDemoStore.getState().auditEvents.at(-1)!
    expect(last.action).toBe('ai_recommendation_accepted')
  })

  it('requires a reason to dismiss', () => {
    expect(() => dismissRecommendation(DUP_REC, '', 'user-maya')).toThrow(/reason/i)
  })

  it('dismisses with a reason and records it', () => {
    dismissRecommendation(DUP_REC, 'Confirmed unique with the client', 'user-maya')
    expect(rec(DUP_REC).status).toBe('dismissed')
    expect(rec(DUP_REC).dismissReason).toContain('Confirmed unique')
    expect(useDemoStore.getState().auditEvents.at(-1)!.action).toBe('ai_recommendation_dismissed')
  })

  it('escalates by creating a reviewer issue', () => {
    const beforeIssues = useDemoStore.getState().issues.length
    const issue = escalateRecommendation(EQUIP_REC, 'user-maya')
    expect(issue).not.toBeNull()
    expect(rec(EQUIP_REC).status).toBe('escalated')
    expect(useDemoStore.getState().issues.length).toBe(beforeIssues + 1)
    expect(issue!.assignedTo).toBe('user-daniel')
    expect(useDemoStore.getState().auditEvents.at(-1)!.action).toBe('ai_recommendation_escalated')
  })

  it('asks the client by opening a client-visible thread', () => {
    const beforeThreads = useDemoStore.getState().threads.length
    const threadId = askClientAboutRecommendation('ai-rec-missing-mortgage', 'user-maya')
    expect(threadId).not.toBeNull()
    expect(useDemoStore.getState().threads.length).toBe(beforeThreads + 1)
    const thread = useDemoStore.getState().threads.find((t) => t.id === threadId)!
    expect(thread.visibility).toBe('client_visible')
  })

  it('can undo accept/dismiss/escalate but not while pending', () => {
    expect(canUndo(rec(DUP_REC))).toBe(false)
    acceptRecommendation(DUP_REC, 'user-maya')
    expect(canUndo(rec(DUP_REC))).toBe(true)
    undoRecommendation(DUP_REC, 'user-maya')
    expect(rec(DUP_REC).status).toBe('pending')
    expect(useDemoStore.getState().auditEvents.at(-1)!.action).toBe('ai_recommendation_undo')
  })
})

describe('ai-service — correction ties back to the recommendation', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('correcting a field overrides the linked recommendation and audits it', () => {
    const before = auditCount()
    correctField('field-1001-wages-acme', 84250, 'OCR misread the first digit', 'user-maya')
    expect(rec(WAGE_REC).status).toBe('overridden')
    const field = useDemoStore.getState().fields.find((f) => f.id === 'field-1001-wages-acme')!
    expect(field.value).toBe(84250)
    expect(field.state).toBe('override')
    expect(auditCount()).toBe(before + 1)
  })
})

describe('ai-service — AI never silently overwrites a verified value', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('accepting a recommendation does not change any field value', () => {
    const field = useDemoStore.getState().fields.find((f) => f.id === 'field-1001-wages-acme')!
    const original = field.value
    acceptRecommendation(WAGE_REC, 'user-maya')
    const after = useDemoStore.getState().fields.find((f) => f.id === 'field-1001-wages-acme')!
    expect(after.value).toBe(original)
    expect(after.state).toBe('ai_extracted')
  })
})
