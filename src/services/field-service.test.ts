import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveFieldDisplayState,
  computeFieldValue,
  getCalculationBreakdown,
  correctField,
  verifyField,
  getFieldsNeedingReview,
  formatCurrency,
} from './field-service'
import { useDemoStore } from '@/store/demo-store'
import { createSeedState } from '@/data/seed'
import type { ReturnField } from '@/domain/types'

function field(overrides: Partial<ReturnField> = {}): ReturnField {
  return {
    id: 'f',
    returnId: 'RET-1001',
    line: '1',
    label: 'Field',
    value: 100,
    formattedValue: '$100',
    sources: [{ documentId: 'doc-x', page: 1, section: 'Box 1' }],
    calculation: null,
    confidence: 'high',
    confidenceScore: 90,
    state: 'ai_extracted',
    ...overrides,
  }
}

describe('field-service — display state resolution', () => {
  it('maps low-confidence AI extraction to needs verification', () => {
    expect(resolveFieldDisplayState(field({ state: 'ai_extracted', confidence: 'low' }))).toBe('needs_verification')
  })
  it('maps high-confidence AI extraction to AI-generated', () => {
    expect(resolveFieldDisplayState(field({ state: 'ai_extracted', confidence: 'high' }))).toBe('ai_generated')
  })
  it('maps verified state', () => {
    expect(resolveFieldDisplayState(field({ state: 'verified' }))).toBe('verified')
  })
  it('maps override to corrected', () => {
    expect(resolveFieldDisplayState(field({ state: 'override' }))).toBe('corrected')
  })
  it('maps needs_approval to approval required', () => {
    expect(resolveFieldDisplayState(field({ state: 'needs_approval' }))).toBe('approval_required')
  })
  it('maps a calculated field to read-only calculation', () => {
    expect(resolveFieldDisplayState(field({ calculation: 'a + b' }))).toBe('read_only_calc')
  })
  it('maps a sourceless empty field to missing source', () => {
    expect(resolveFieldDisplayState(field({ sources: [], value: null, state: 'editable' }))).toBe('missing_source')
  })
})

describe('field-service — currency', () => {
  it('formats numbers and blanks', () => {
    expect(formatCurrency(84250)).toBe('$84,250')
    expect(formatCurrency(null)).toBe('—')
  })
})

describe('field-service — live calculation', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('computes total wages from its inputs', () => {
    const { fields, calculations } = useDemoStore.getState()
    const totalWages = fields.find((f) => f.id === 'field-1001-wages-total')!
    const result = computeFieldValue(totalWages, fields, calculations)
    // 48,250 (AI, pre-correction) + 6,500
    expect(result.value).toBe(54750)
  })

  it('combines multiple bank interest records into total interest', () => {
    const { fields, calculations } = useDemoStore.getState()
    const totalInterest = fields.find((f) => f.id === 'field-1001-interest')!
    const result = computeFieldValue(totalInterest, fields, calculations)
    expect(result.value).toBe(1775) // 1220 + 340 + 215
    const breakdown = getCalculationBreakdown(totalInterest, fields, calculations)
    expect(breakdown?.inputs.length).toBe(3)
    expect(breakdown?.result).toBe('$1,775')
  })

  it('recomputes totals after a correction cascades', () => {
    correctField('field-1001-wages-acme', 84250, 'OCR misread first digit', 'user-maya')
    const { fields, calculations } = useDemoStore.getState()
    const totalWages = fields.find((f) => f.id === 'field-1001-wages-total')!
    expect(computeFieldValue(totalWages, fields, calculations).value).toBe(90750) // 84250 + 6500
  })
})

describe('field-service — correction flow', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('requires a reason', () => {
    expect(() => correctField('field-1001-wages-acme', 84250, '', 'user-maya')).toThrow(/reason/i)
  })

  it('updates value and preserves the AI value', () => {
    correctField('field-1001-wages-acme', 84250, 'OCR misread first digit; verified against physical copy', 'user-maya')
    const f = useDemoStore.getState().fields.find((x) => x.id === 'field-1001-wages-acme')!
    expect(f.value).toBe(84250)
    expect(f.aiExtractedValue).toBe(48250)
    expect(f.state).toBe('override')
    expect(f.correctionReason).toContain('OCR misread')
    expect(f.correctedBy).toBe('user-maya')
  })

  it('records an audit event for the correction', () => {
    const before = useDemoStore.getState().auditEvents.length
    correctField('field-1001-wages-acme', 84250, 'verified against physical copy', 'user-maya')
    const after = useDemoStore.getState().auditEvents
    expect(after.length).toBe(before + 1)
    expect(after[after.length - 1].action).toBe('field_corrected')
  })

  it('surfaces the corrected field to the reviewer queue', () => {
    correctField('field-1001-wages-acme', 84250, 'verified against physical copy', 'user-maya')
    const needsReview = getFieldsNeedingReview(useDemoStore.getState().fields)
    expect(needsReview.some((f) => f.id === 'field-1001-wages-acme')).toBe(true)
  })

  it('marks the linked AI recommendation as overridden', () => {
    correctField('field-1001-wages-acme', 84250, 'verified against physical copy', 'user-maya')
    const rec = useDemoStore.getState().recommendations.find((r) => r.id === 'ai-rec-acme-wage-mismatch')!
    expect(rec.status).toBe('overridden')
  })
})

describe('field-service — verification', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('marks a field verified with an audit event', () => {
    verifyField('field-1001-childcare', 'user-maya')
    const f = useDemoStore.getState().fields.find((x) => x.id === 'field-1001-childcare')!
    expect(f.state).toBe('verified')
    expect(f.verifiedBy).toBe('user-maya')
  })
})
