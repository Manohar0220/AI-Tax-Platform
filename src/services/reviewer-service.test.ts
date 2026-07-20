import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildReviewQueue,
  approveField,
  reopenField,
  resolveIssue,
  requestChanges,
  approveReturn,
} from './reviewer-service'
import { correctField } from './field-service'
import { filterThreadsForRole, filterMessagesForRole } from './collaboration-service'
import { useDemoStore } from '@/store/demo-store'
import { createSeedState } from '@/data/seed'

function state() { return useDemoStore.getState() }
function field(id: string) { return state().fields.find((f) => f.id === id)! }
function ret(id: string) { return state().returns.find((r) => r.id === id)! }

describe('reviewer-service — review queue priority', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('includes only returns assigned to the reviewer', () => {
    const rows = buildReviewQueue(
      { returns: state().returns, fields: state().fields, issues: state().issues, recommendations: state().recommendations },
      'user-daniel',
    )
    expect(rows.every((r) => r.ret.reviewerId === 'user-daniel')).toBe(true)
  })

  it('surfaces Sarah (needs-approval field) and Alex (high-risk issue)', () => {
    const rows = buildReviewQueue(
      { returns: state().returns, fields: state().fields, issues: state().issues, recommendations: state().recommendations },
      'user-daniel',
    )
    const ids = rows.map((r) => r.ret.id)
    expect(ids).toContain('RET-1001')
    expect(ids).toContain('RET-2001')
  })

  it('ranks a manual correction higher and counts it', () => {
    correctField('field-1001-wages-acme', 84250, 'OCR misread', 'user-maya')
    const rows = buildReviewQueue(
      { returns: state().returns, fields: state().fields, issues: state().issues, recommendations: state().recommendations },
      'user-daniel',
    )
    const sarah = rows.find((r) => r.ret.id === 'RET-1001')!
    expect(sarah.correctionCount).toBeGreaterThanOrEqual(1)
  })
})

describe('reviewer-service — approve & lock', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('locks a field on approval', () => {
    approveField('field-1001-dividends', 'user-daniel')
    expect(field('field-1001-dividends').state).toBe('locked')
    expect(field('field-1001-dividends').verifiedBy).toBe('user-daniel')
  })

  it('a locked field cannot be corrected without reopening', () => {
    approveField('field-1001-dividends', 'user-daniel')
    expect(() => correctField('field-1001-dividends', 999, 'change', 'user-maya')).toThrow(/locked/i)
    reopenField('field-1001-dividends', 'user-maya')
    expect(field('field-1001-dividends').state).toBe('needs_approval')
    // now editable again
    correctField('field-1001-dividends', 999, 'confirmed with client', 'user-maya')
    expect(field('field-1001-dividends').value).toBe(999)
  })
})

describe('reviewer-service — change request flow (Alex equipment)', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('moves the return to changes_requested and creates a preparer task', () => {
    const beforeTasks = state().tasks.length
    requestChanges({
      returnId: 'RET-2001',
      target: { issueId: 'issue-equipment-use', documentId: 'doc-rp-equipment' },
      internalNote: 'Confirm whether this equipment was used entirely for business.',
      clientQuestion: 'Was this equipment used entirely for business?',
      byUserId: 'user-daniel',
    })
    expect(ret('RET-2001').stage).toBe('changes_requested')
    expect(ret('RET-2001').nextResponsibleRole).toBe('tax_preparer')
    const tasks = state().tasks.filter((t) => t.returnId === 'RET-2001')
    const newTask = tasks.find((t) => t.assignedTo === 'user-maya' && t.description.includes('entirely for business'))
    expect(newTask).toBeTruthy()
    expect(beforeTasks).toBeLessThan(state().tasks.length)
  })

  it('keeps internal reviewer wording hidden from the client', () => {
    requestChanges({
      returnId: 'RET-2001',
      internalNote: 'INTERNAL: business-use % looks aggressive; push for documentation.',
      clientQuestion: 'Was this equipment used entirely for business?',
      byUserId: 'user-daniel',
    })
    // Client (business owner) view of RET-2001 threads
    const clientThreads = filterThreadsForRole(state().threads, 'business_owner', 'RET-2001')
    // No internal thread visible
    expect(clientThreads.some((t) => t.visibility === 'internal_only')).toBe(false)
    // No client-visible message contains the internal wording
    for (const t of clientThreads) {
      const msgs = filterMessagesForRole(state().messages, t, 'business_owner')
      expect(msgs.some((m) => m.content.includes('INTERNAL'))).toBe(false)
    }
    // But a plain client question exists
    expect(clientThreads.some((t) => t.subject.includes('quick question'))).toBe(true)
  })
})

describe('reviewer-service — approval flow (Sarah)', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('locks reviewed fields and advances to client approval', () => {
    correctField('field-1001-wages-acme', 84250, 'OCR misread first digit', 'user-maya')
    approveReturn('RET-1001', 'user-daniel')

    expect(ret('RET-1001').stage).toBe('waiting_for_client_approval')
    expect(ret('RET-1001').nextResponsibleRole).toBe('individual_taxpayer')
    // corrected + needs_approval fields are now locked
    expect(field('field-1001-wages-acme').state).toBe('locked')
    expect(field('field-1001-dividends').state).toBe('locked')
  })

  it('preparer cannot change a locked field after approval', () => {
    correctField('field-1001-wages-acme', 84250, 'OCR misread first digit', 'user-maya')
    approveReturn('RET-1001', 'user-daniel')
    expect(() => correctField('field-1001-wages-acme', 100, 'oops', 'user-maya')).toThrow(/locked/i)
  })

  it('resolves an issue', () => {
    resolveIssue('issue-missing-mortgage', 'user-daniel')
    expect(state().issues.find((i) => i.id === 'issue-missing-mortgage')!.status).toBe('resolved')
  })
})
