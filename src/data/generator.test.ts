import { describe, it, expect } from 'vitest'
import {
  generateReturns,
  generateDocuments,
  generateTasks,
  generateRequests,
  generateAIWarnings,
  generateAllScaleData,
} from './generator'

describe('Data Generator', () => {
  it('generates the correct number of returns', () => {
    const returns = generateReturns(80)
    expect(returns).toHaveLength(80)
  })

  it('generates deterministic returns (same output on every call)', () => {
    const first = generateReturns(10)
    const second = generateReturns(10)
    expect(first).toEqual(second)
  })

  it('generates returns with valid IDs', () => {
    const returns = generateReturns(5)
    returns.forEach((r, i) => {
      expect(r.id).toBe(`RET-${4000 + i}`)
    })
  })

  it('generates returns with valid stages', () => {
    const validStages = [
      'collecting_information', 'waiting_on_client', 'ready_to_prepare', 'preparing',
      'ready_for_review', 'under_review', 'changes_requested',
      'waiting_for_client_approval', 'ready_to_file', 'filed', 'filing_rejected',
    ]
    const returns = generateReturns(80)
    returns.forEach((r) => {
      expect(validStages).toContain(r.stage)
    })
  })

  it('generates returns with valid priorities', () => {
    const returns = generateReturns(80)
    returns.forEach((r) => {
      expect(['low', 'medium', 'high']).toContain(r.priority)
    })
  })

  it('generates the correct number of documents', () => {
    const docs = generateDocuments(250)
    expect(docs).toHaveLength(250)
  })

  it('generates deterministic documents', () => {
    const first = generateDocuments(10)
    const second = generateDocuments(10)
    expect(first).toEqual(second)
  })

  it('generates the correct number of tasks', () => {
    const tasks = generateTasks(180)
    expect(tasks).toHaveLength(180)
  })

  it('generates the correct number of requests', () => {
    const requests = generateRequests(90)
    expect(requests).toHaveLength(90)
  })

  it('generates the correct number of AI warnings', () => {
    const warnings = generateAIWarnings(60)
    expect(warnings).toHaveLength(60)
  })

  it('generateAllScaleData returns all collections', () => {
    const data = generateAllScaleData()
    expect(data.returns).toHaveLength(80)
    expect(data.documents).toHaveLength(250)
    expect(data.tasks).toHaveLength(180)
    expect(data.requests).toHaveLength(90)
    expect(data.aiWarnings).toHaveLength(60)
  })

  it('generateAllScaleData is deterministic', () => {
    const first = generateAllScaleData()
    const second = generateAllScaleData()
    expect(first).toEqual(second)
  })

  it('generated returns spread across different stages', () => {
    const returns = generateReturns(80)
    const stages = new Set(returns.map((r) => r.stage))
    expect(stages.size).toBeGreaterThan(5)
  })

  it('generated returns include both individual and business types', () => {
    const returns = generateReturns(80)
    const types = new Set(returns.map((r) => r.type))
    expect(types.has('individual')).toBe(true)
    expect(types.has('business')).toBe(true)
  })

  it('generated returns have some with blockers', () => {
    const returns = generateReturns(80)
    const blocked = returns.filter((r) => r.blocker !== null)
    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.length).toBeLessThan(80)
  })
})
