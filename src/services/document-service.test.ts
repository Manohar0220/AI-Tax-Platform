import { describe, it, expect } from 'vitest'
import {
  categorizeDocument,
  validateFile,
  getDocumentAction,
  STATUS_LABELS,
} from './document-service'
import type { Document } from '@/domain/types'

function makeDoc(overrides: Partial<Document> = {}): Document {
  return {
    id: 'test-doc',
    returnId: 'RET-1001',
    name: 'Test Doc',
    type: 'W-2',
    status: 'received',
    uploadedAt: '2026-01-01T10:00:00Z',
    uploadedBy: 'user-sarah',
    pageCount: 1,
    fileSize: '200 KB',
    notes: null,
    ...overrides,
  }
}

describe('Document Service', () => {
  describe('categorizeDocument', () => {
    it('categorizes W-2 as income for individuals', () => {
      expect(categorizeDocument(makeDoc({ type: 'W-2' }), 'individual')).toBe('income')
    })

    it('categorizes 1098 as home for individuals', () => {
      expect(categorizeDocument(makeDoc({ type: '1098' }), 'individual')).toBe('home')
    })

    it('categorizes 1099-DIV as investments for individuals', () => {
      expect(categorizeDocument(makeDoc({ type: '1099-DIV' }), 'individual')).toBe('investments')
    })

    it('categorizes Bank Statement as banking for business', () => {
      expect(categorizeDocument(makeDoc({ type: 'Bank Statement' }), 'business')).toBe('banking')
    })

    it('categorizes Invoice as expenses for business', () => {
      expect(categorizeDocument(makeDoc({ type: 'Invoice' }), 'business')).toBe('expenses')
    })

    it('categorizes unknown types as other', () => {
      expect(categorizeDocument(makeDoc({ type: 'Unknown' }), 'individual')).toBe('other')
    })
  })

  describe('validateFile', () => {
    it('accepts PDF files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      expect(validateFile(file).valid).toBe(true)
    })

    it('accepts JPG files', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      expect(validateFile(file).valid).toBe(true)
    })

    it('accepts PNG files', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' })
      expect(validateFile(file).valid).toBe(true)
    })

    it('rejects unsupported file types', () => {
      const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats' })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unsupported file type')
    })

    it('rejects files over 25 MB', () => {
      const bigContent = new ArrayBuffer(26 * 1024 * 1024)
      const file = new File([bigContent], 'big.pdf', { type: 'application/pdf' })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
    })
  })

  describe('getDocumentAction', () => {
    it('returns upload for missing docs', () => {
      const action = getDocumentAction(makeDoc({ status: 'missing' }))
      expect(action?.type).toBe('upload')
    })

    it('returns replace for needs_replacement', () => {
      const action = getDocumentAction(makeDoc({ status: 'needs_replacement' }))
      expect(action?.type).toBe('replace')
    })

    it('returns resolve for duplicate_warning', () => {
      const action = getDocumentAction(makeDoc({ status: 'duplicate_warning' }))
      expect(action?.type).toBe('resolve')
    })

    it('returns view for received docs', () => {
      const action = getDocumentAction(makeDoc({ status: 'received' }))
      expect(action?.type).toBe('view')
    })

    it('returns view for verified docs', () => {
      const action = getDocumentAction(makeDoc({ status: 'verified' }))
      expect(action?.type).toBe('view')
    })
  })

  describe('STATUS_LABELS', () => {
    it('has labels for all statuses', () => {
      expect(STATUS_LABELS.missing).toBe('Needed')
      expect(STATUS_LABELS.received).toBe('Received')
      expect(STATUS_LABELS.verified).toBe('Accepted')
      expect(STATUS_LABELS.needs_review).toBe('Needs Review')
      expect(STATUS_LABELS.needs_replacement).toBe('Needs Replacement')
      expect(STATUS_LABELS.duplicate_warning).toBe('Possible Duplicate')
    })
  })
})
