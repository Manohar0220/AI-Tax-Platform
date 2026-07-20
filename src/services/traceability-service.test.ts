import { describe, it, expect } from 'vitest'
import {
  getDocumentIdsForField,
  getFieldsForDocument,
  isMissingSource,
  hasConflictingSources,
  isMultiDocument,
} from './traceability-service'
import { DEMO_FIELDS } from '@/data/fields'

const byId = (id: string) => DEMO_FIELDS.find((f) => f.id === id)!

describe('traceability-service — bidirectional links', () => {
  it('field → document: single source', () => {
    expect(getDocumentIdsForField(byId('field-1001-wages-acme'))).toEqual(['doc-acme-w2'])
  })

  it('field → documents: calculated field spans several documents', () => {
    const docs = getDocumentIdsForField(byId('field-1001-total-income'))
    expect(docs.length).toBeGreaterThan(1)
    expect(docs).toContain('doc-acme-w2')
    expect(docs).toContain('doc-horizon-interest')
    expect(isMultiDocument(byId('field-1001-total-income'))).toBe(true)
  })

  it('document → fields: one document supports several fields', () => {
    const fields = getFieldsForDocument(DEMO_FIELDS, 'doc-acme-w2')
    const ids = fields.map((f) => f.id)
    expect(ids).toContain('field-1001-wages-acme')
    expect(ids).toContain('field-1001-wages-total')
    expect(ids).toContain('field-1001-total-income')
    expect(ids).toContain('field-1001-withholding')
    expect(fields.length).toBeGreaterThanOrEqual(4)
  })

  it('round-trips: every document a field points to lists that field back', () => {
    const field = byId('field-1001-wages-acme')
    for (const docId of getDocumentIdsForField(field)) {
      const back = getFieldsForDocument(DEMO_FIELDS, docId).map((f) => f.id)
      expect(back).toContain(field.id)
    }
  })
})

describe('traceability-service — edge cases', () => {
  it('detects a missing source', () => {
    expect(isMissingSource(byId('field-1001-mortgage-interest'))).toBe(true)
    expect(isMissingSource(byId('field-1001-wages-acme'))).toBe(false)
  })

  it('detects conflicting sources on dividends', () => {
    expect(hasConflictingSources(byId('field-1001-dividends'))).toBe(true)
    expect(hasConflictingSources(byId('field-1001-wages-acme'))).toBe(false)
  })

  it('includes a conflicting document in the field → document set', () => {
    // Same document, but the conflict page is still traced.
    const docs = getDocumentIdsForField(byId('field-1001-dividends'))
    expect(docs).toContain('doc-summit-investment')
  })
})
