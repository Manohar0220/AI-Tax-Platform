import type { Document, AuditEvent } from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'

export type DocumentCategory =
  | 'income' | 'home' | 'investments' | 'family' | 'other'
  | 'expenses' | 'banking' | 'payroll' | 'contractors' | 'assets' | 'legal'

const INDIVIDUAL_CATEGORIES: Record<string, DocumentCategory> = {
  'W-2': 'income',
  '1099-INT': 'investments',
  '1099-DIV': 'investments',
  '1099-NEC': 'income',
  '1099-MISC': 'income',
  '1098': 'home',
  'Receipt': 'other',
  'Donation Receipt': 'other',
  'Prior Return': 'other',
  'ID': 'other',
}

const BUSINESS_CATEGORIES: Record<string, DocumentCategory> = {
  'Financial Statement': 'income',
  'Bank Statement': 'banking',
  'Payroll': 'payroll',
  '1099-NEC Summary': 'contractors',
  'Invoice': 'expenses',
  'Lease': 'legal',
  'Insurance': 'legal',
}

export function categorizeDocument(doc: Document, returnType: 'individual' | 'business'): DocumentCategory {
  if (returnType === 'business') {
    // Capital purchases (e.g. the equipment invoice) belong under Assets.
    if (/equipment|asset/i.test(doc.name)) return 'assets'
    return BUSINESS_CATEGORIES[doc.type] || 'other'
  }
  return INDIVIDUAL_CATEGORIES[doc.type] || 'other'
}

export const INDIVIDUAL_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  income: 'Income',
  home: 'Home & Property',
  investments: 'Investments',
  family: 'Family',
  other: 'Other',
  expenses: 'Expenses',
  banking: 'Banking',
  payroll: 'Payroll',
  contractors: 'Contractors',
  assets: 'Assets',
  legal: 'Legal & Insurance',
}

export const BUSINESS_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  income: 'Income',
  expenses: 'Expenses',
  banking: 'Banking',
  payroll: 'Payroll',
  contractors: 'Contractors',
  assets: 'Assets',
  legal: 'Legal & Insurance',
  other: 'Other',
  home: 'Home & Property',
  investments: 'Investments',
  family: 'Family',
}

export const STATUS_LABELS: Record<string, string> = {
  missing: 'Needed',
  received: 'Received',
  processing: 'Processing',
  needs_review: 'Needs Review',
  verified: 'Accepted',
  needs_replacement: 'Needs Replacement',
  duplicate_warning: 'Possible Duplicate',
}

export const STATUS_VARIANTS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  missing: 'warning',
  received: 'default',
  processing: 'primary',
  needs_review: 'warning',
  verified: 'success',
  needs_replacement: 'error',
  duplicate_warning: 'warning',
}

export function getDocumentAction(doc: Document): { label: string; type: 'upload' | 'replace' | 'resolve' | 'view' | 'none' } | null {
  switch (doc.status) {
    case 'missing':
      return { label: 'Upload', type: 'upload' }
    case 'needs_replacement':
      return { label: 'Upload replacement', type: 'replace' }
    case 'duplicate_warning':
      return { label: 'Resolve', type: 'resolve' }
    case 'received':
    case 'verified':
    case 'needs_review':
      return { label: 'View', type: 'view' }
    default:
      return null
  }
}

export function simulateUpload(
  documentId: string,
  fileName: string,
  onProgress: (pct: number) => void,
  onComplete: () => void,
) {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.random() * 25 + 10
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
      onProgress(100)

      setTimeout(() => {
        const state = useDemoStore.getState()
        const now = new Date().toISOString()
        const uploaderId = state.users[0]?.id || 'unknown'
        const docReturnId = state.documents.find((d) => d.id === documentId)?.returnId || ''

        const docs = state.documents.map((d) => {
          if (d.id === documentId) {
            return {
              ...d,
              status: 'received' as const,
              uploadedAt: now,
              uploadedBy: uploaderId,
              pageCount: 1,
              fileSize: '340 KB',
              notes: null,
            }
          }
          return d
        })

        // Resolve any pending request that this document fulfils.
        const requests = state.requests.map((r) => {
          if (r.status === 'pending' && (r.linkedDocumentId === documentId || r.returnId === docReturnId)) {
            return { ...r, status: 'fulfilled' as const, fulfilledAt: now }
          }
          return r
        })

        // If no pending requests remain on the return, hand responsibility back
        // to the preparer and clear the "waiting on client" state.
        const remainingPending = requests.filter((r) => r.returnId === docReturnId && r.status === 'pending')
        const returns = state.returns.map((r) => {
          if (r.id !== docReturnId) return r
          if (r.stage !== 'waiting_on_client' || remainingPending.length > 0) return r
          return {
            ...r,
            stage: 'ready_to_prepare' as const,
            nextResponsibleRole: 'tax_preparer' as const,
            blocker: null,
            nextAction: 'Review the newly uploaded document and continue preparation.',
            updatedAt: now,
            stageHistory: [
              ...r.stageHistory,
              { stage: 'ready_to_prepare' as const, enteredAt: now, completedAt: null, completedBy: null, reason: 'Client uploaded the requested document' },
            ],
          }
        })

        const auditEvent: AuditEvent = {
          id: `audit-upload-${Date.now()}`,
          returnId: docReturnId,
          userId: uploaderId,
          action: 'document_uploaded',
          target: documentId,
          details: `Uploaded ${fileName}`,
          timestamp: now,
        }

        state.updateState({
          documents: docs,
          requests,
          returns,
          auditEvents: [...state.auditEvents, auditEvent],
        })

        onComplete()
      }, 800)
    } else {
      onProgress(Math.min(progress, 99))
    }
  }, 300)

  return () => clearInterval(interval)
}

export function resolveDuplicate(
  documentId: string,
  resolution: 'same' | 'different' | 'unsure'
) {
  const state = useDemoStore.getState()

  const docs = state.documents.map((d) => {
    if (d.id === documentId) {
      if (resolution === 'same') {
        return { ...d, status: 'verified' as const, notes: 'Confirmed duplicate. Original retained.' }
      } else if (resolution === 'different') {
        return { ...d, status: 'received' as const, notes: 'Confirmed as distinct document.' }
      } else {
        return { ...d, status: 'needs_review' as const, notes: 'Flagged for preparer review.' }
      }
    }
    return d
  })

  const auditEvent: AuditEvent = {
    id: `audit-dup-${Date.now()}`,
    returnId: docs.find((d) => d.id === documentId)?.returnId || '',
    userId: 'user-sarah',
    action: 'duplicate_resolved',
    target: documentId,
    details: `Duplicate resolution: ${resolution}`,
    timestamp: new Date().toISOString(),
  }

  state.updateState({
    documents: docs,
    auditEvents: [...state.auditEvents, auditEvent],
  })
}

export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
export const MAX_FILE_SIZE_MB = 25
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: `Unsupported file type. Please upload a PDF, JPG, or PNG file.` }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_FILE_SIZE_MB} MB.` }
  }
  return { valid: true }
}
