import { describe, it, expect, beforeEach } from 'vitest'
import {
  submitEquipmentResponse,
  addSupportingDocument,
  getBusinessSummary,
  clientApproveReturn,
} from './business-service'
import { categorizeDocument } from './document-service'
import { filterThreadsForRole, filterMessagesForRole } from './collaboration-service'
import { useDemoStore } from '@/store/demo-store'
import { createSeedState } from '@/data/seed'
import type { Document } from '@/domain/types'

function state() { return useDemoStore.getState() }
function ret(id: string) { return state().returns.find((r) => r.id === id)! }
function req(id: string) { return state().requests.find((r) => r.id === id)! }

function doc(name: string, type: string): Document {
  return {
    id: 'd', returnId: 'RET-2001', name, type, status: 'received',
    uploadedAt: null, uploadedBy: null, pageCount: 1, fileSize: '1 KB', notes: null,
  }
}

describe('business-service — document categorization', () => {
  it('routes business documents to the right groups', () => {
    expect(categorizeDocument(doc('Payroll Summary', 'Payroll'), 'business')).toBe('payroll')
    expect(categorizeDocument(doc('Contractor Payment Summary', '1099-NEC Summary'), 'business')).toBe('contractors')
    expect(categorizeDocument(doc('Office Lease Agreement', 'Lease'), 'business')).toBe('legal')
    expect(categorizeDocument(doc('Business Insurance Statement', 'Insurance'), 'business')).toBe('legal')
    expect(categorizeDocument(doc('Equipment Purchase Invoice — $12,500', 'Invoice'), 'business')).toBe('assets')
    expect(categorizeDocument(doc('Annual Profit and Loss Statement', 'Financial Statement'), 'business')).toBe('income')
  })
})

describe('business-service — equipment response flow', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  const base = {
    returnId: 'RET-2001',
    requestId: 'req-equipment-statement',
    issueId: 'issue-equipment-use',
    byUserId: 'user-alex',
  }

  it('resolves the client request', () => {
    submitEquipmentResponse({ ...base, usage: 'partly', percentage: 85, explanation: 'Studio camera used for shoots.' })
    expect(req('req-equipment-statement').status).toBe('fulfilled')
  })

  it('moves ownership of the next action from Alex to Maya', () => {
    expect(ret('RET-2001').nextResponsibleRole).toBe('tax_preparer')
    submitEquipmentResponse({ ...base, usage: 'entirely', explanation: '' })
    expect(ret('RET-2001').nextResponsibleRole).toBe('tax_preparer')
    // A task is created for the preparer.
    const task = state().tasks.find((t) => t.title === 'Review equipment business-use response')
    expect(task).toBeTruthy()
    expect(task!.assignedTo).toBe('user-maya')
  })

  it('records the response on the issue and bumps progress', () => {
    const before = ret('RET-2001').completionPercentage
    submitEquipmentResponse({ ...base, usage: 'partly', percentage: 85, explanation: 'Studio camera.' })
    const issue = state().issues.find((i) => i.id === 'issue-equipment-use')!
    expect(issue.description).toContain('Client response')
    expect(issue.description).toContain('85%')
    expect(ret('RET-2001').completionPercentage).toBeGreaterThan(before)
  })

  it('logs the answer in a client-visible thread with no internal wording', () => {
    submitEquipmentResponse({ ...base, usage: 'partly', percentage: 85, explanation: 'Studio camera.' })
    const clientThreads = filterThreadsForRole(state().threads, 'business_owner', 'RET-2001')
    const withResponse = clientThreads.some((t) =>
      filterMessagesForRole(state().messages, t, 'business_owner').some((m) => m.content.includes('85%')),
    )
    expect(withResponse).toBe(true)
  })
})

describe('business-service — supporting document upload', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))
  it('adds a received document', () => {
    const before = state().documents.length
    const d = addSupportingDocument('RET-2001', 'Equipment business-use statement', 'user-alex')
    expect(state().documents.length).toBe(before + 1)
    expect(d.status).toBe('received')
    expect(d.returnId).toBe('RET-2001')
  })
})

describe('business-service — return summary and approval', () => {
  beforeEach(() => useDemoStore.setState(createSeedState()))

  it('exposes a client-friendly summary', () => {
    const s = getBusinessSummary('RET-2001')!
    expect(s.income).toBeGreaterThan(0)
    expect(s.taxableProfit).toBe(s.income - Math.abs(s.expenses))
    expect(s.acknowledgements.length).toBeGreaterThan(0)
  })

  it('client approval advances the return toward filing', () => {
    clientApproveReturn('RET-2001', 'user-alex')
    expect(ret('RET-2001').stage).toBe('ready_to_file')
    expect(ret('RET-2001').nextResponsibleRole).toBe('tax_preparer')
  })
})
