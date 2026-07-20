import type { AuditEvent, Document, Role, Task } from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'
import { postMessage, createThread } from './collaboration-service'

export type EquipmentUsage = 'entirely' | 'partly' | 'no' | 'unsure'

export const EQUIPMENT_USAGE_LABELS: Record<EquipmentUsage, string> = {
  entirely: 'Yes, entirely for business',
  partly: 'Partly for business',
  no: 'No',
  unsure: "I'm not sure",
}

function pushAudit(returnId: string, userId: string, action: string, target: string, details: string) {
  const state = useDemoStore.getState()
  const event: AuditEvent = {
    id: `audit-${action}-${Date.now()}`,
    returnId, userId, action, target, details,
    timestamp: new Date().toISOString(),
  }
  state.updateState({ auditEvents: [...state.auditEvents, event] })
}

export interface EquipmentResponseInput {
  returnId: string
  requestId: string
  issueId: string
  usage: EquipmentUsage
  percentage?: number
  explanation: string
  byUserId: string
}

/** Human-readable summary of the client's answer. */
function describeResponse(input: EquipmentResponseInput): string {
  const usageText =
    input.usage === 'partly' && input.percentage !== undefined
      ? `Partly for business (${input.percentage}%)`
      : EQUIPMENT_USAGE_LABELS[input.usage]
  return input.explanation.trim()
    ? `${usageText}. ${input.explanation.trim()}`
    : usageText
}

/**
 * Alex submits his equipment business-use answer. This resolves the client
 * request, records the answer on the issue, notifies Maya with a task, and moves
 * ownership of the next action back to the preparer.
 */
export function submitEquipmentResponse(input: EquipmentResponseInput) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const ret = state.returns.find((r) => r.id === input.returnId)
  const summary = describeResponse(input)

  // 1. Resolve the client request.
  const requests = state.requests.map((r) =>
    r.id === input.requestId ? { ...r, status: 'fulfilled' as const, fulfilledAt: now } : r,
  )

  // 2. Record the response on the issue and mark it in progress for the preparer.
  const issues = state.issues.map((i) =>
    i.id === input.issueId
      ? { ...i, status: 'in_progress' as const, description: `${i.description}\n\nClient response: ${summary}` }
      : i,
  )

  // 3. Notify Maya via a task.
  const preparerId = ret?.preparerId || 'user-maya'
  const task: Task = {
    id: `task-equip-response-${Date.now()}`,
    returnId: input.returnId,
    title: 'Review equipment business-use response',
    description: `Alex responded: ${summary}`,
    status: 'open',
    assignedTo: preparerId,
    createdBy: input.byUserId,
    dueDate: ret?.deadline ?? null,
    priority: 'high',
    createdAt: now,
    completedAt: null,
  }

  // 4. Move ownership of the next action to Maya and nudge progress.
  const returns = state.returns.map((r) =>
    r.id === input.returnId
      ? {
          ...r,
          nextAction: "Review the client's equipment business-use response",
          nextResponsibleRole: 'tax_preparer' as Role,
          completionPercentage: Math.min(100, r.completionPercentage + 10),
          updatedAt: now,
        }
      : r,
  )

  state.updateState({ requests, issues, returns, tasks: [...state.tasks, task] })

  // 5. Log the answer in the client-visible equipment thread (or start one).
  const existing = state.threads.find((t) => t.linkedIssueId === input.issueId && t.visibility === 'client_visible')
  if (existing) {
    postMessage({ threadId: existing.id, senderId: input.byUserId, content: summary })
  } else {
    createThread({
      returnId: input.returnId,
      subject: 'Equipment business-use',
      authorId: input.byUserId,
      content: summary,
      participants: [input.byUserId, preparerId],
      linkedIssueId: input.issueId,
      visibility: 'client_visible',
    })
  }

  pushAudit(input.returnId, input.byUserId, 'equipment_response_submitted', input.issueId, `Equipment business-use response: ${summary}`)
}

/** Simulate uploading a supporting receipt/statement for a business return. */
export function addSupportingDocument(returnId: string, name: string, byUserId: string): Document {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const doc: Document = {
    id: `doc-support-${Date.now()}`,
    returnId,
    name,
    type: 'Receipt',
    status: 'received',
    uploadedAt: now,
    uploadedBy: byUserId,
    pageCount: 1,
    fileSize: '210 KB',
    notes: 'Uploaded as supporting evidence.',
  }
  state.updateState({ documents: [...state.documents, doc] })
  pushAudit(returnId, byUserId, 'document_uploaded', doc.id, `Uploaded supporting document: ${name}`)
  return doc
}

// ---------------------------------------------------------------------------
// Business return summary (fabricated client-facing figures)
// ---------------------------------------------------------------------------

export interface BusinessSummary {
  income: number
  expenses: number
  taxableProfit: number
  estimatedDue: number
  breakdown: { label: string; value: number }[]
  acknowledgements: string[]
}

const BUSINESS_SUMMARIES: Record<string, BusinessSummary> = {
  'RET-2001': {
    income: 248500,
    expenses: 176200,
    taxableProfit: 72300,
    estimatedDue: 14900,
    breakdown: [
      { label: 'Gross receipts', value: 248500 },
      { label: 'Payroll & contractor costs', value: -98400 },
      { label: 'Rent, insurance & operating', value: -65300 },
      { label: 'Equipment (Section 179)', value: -12500 },
    ],
    acknowledgements: [
      'Equipment business-use percentage is based on your written statement.',
      'Estimated tax due is an estimate and may change before filing.',
    ],
  },
}

export function getBusinessSummary(returnId: string): BusinessSummary | null {
  return BUSINESS_SUMMARIES[returnId] ?? null
}

export interface IndividualSummary {
  totalIncome: number
  withholding: number
  estimatedRefund: number
}

const INDIVIDUAL_SUMMARIES: Record<string, IndividualSummary> = {
  'RET-1001': { totalIncome: 94555, withholding: 8940, estimatedRefund: 2180 },
}

export function getIndividualSummary(returnId: string): IndividualSummary | null {
  return INDIVIDUAL_SUMMARIES[returnId] ?? null
}

/** Client approves the return after review — advances it toward filing. */
export function clientApproveReturn(returnId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const returns = state.returns.map((r) =>
    r.id === returnId
      ? {
          ...r,
          stage: 'ready_to_file' as const,
          nextAction: 'File the return with the tax authority',
          nextResponsibleRole: 'tax_preparer' as Role,
          updatedAt: now,
          stageHistory: [...r.stageHistory, { stage: 'ready_to_file' as const, enteredAt: now, completedAt: null, completedBy: null }],
        }
      : r,
  )
  state.updateState({ returns })
  pushAudit(returnId, byUserId, 'client_approved_return', returnId, 'Client approved the return for filing')
}
