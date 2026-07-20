import type {
  TaxReturn, ReturnField, Issue, AIRecommendation, Task, AuditEvent, Role, StageHistoryEntry,
} from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'
import { createThread } from './collaboration-service'
import { daysBetween, DEMO_TODAY } from './priority-service'

export const REVIEW_STAGES = ['ready_for_review', 'under_review', 'changes_requested'] as const

function pushAudit(returnId: string, userId: string, action: string, target: string, details: string) {
  const state = useDemoStore.getState()
  const event: AuditEvent = {
    id: `audit-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    returnId, userId, action, target, details,
    timestamp: new Date().toISOString(),
  }
  state.updateState({ auditEvents: [...state.auditEvents, event] })
}

// ---------------------------------------------------------------------------
// Review queue (priority logic)
// ---------------------------------------------------------------------------

export interface ReviewRow {
  ret: TaxReturn
  score: number
  reason: string
  reasonKind: 'rejected' | 'escalated' | 'risk' | 'correction' | 'deadline' | 'warning' | 'approval' | 'stage'
  correctionCount: number
  warningCount: number
}

export interface ReviewQueueContext {
  returns: TaxReturn[]
  fields: ReturnField[]
  issues: Issue[]
  recommendations: AIRecommendation[]
  today?: string
}

export function buildReviewQueue(ctx: ReviewQueueContext, reviewerId: string): ReviewRow[] {
  const today = ctx.today ?? DEMO_TODAY
  const rows: ReviewRow[] = []

  for (const ret of ctx.returns) {
    if (ret.reviewerId !== reviewerId) continue

    const overrideFields = ctx.fields.filter((f) => f.returnId === ret.id && f.state === 'override')
    const needsApproval = ctx.fields.filter((f) => f.returnId === ret.id && f.state === 'needs_approval')
    const openHighIssues = ctx.issues.filter(
      (i) => i.returnId === ret.id && i.priority === 'high' && (i.status === 'open' || i.status === 'in_progress'),
    )
    const warnings = ctx.recommendations.filter(
      (r) => r.returnId === ret.id && (r.type === 'warning' || r.type === 'anomaly') && r.status === 'pending',
    )
    const escalated = ctx.recommendations.filter((r) => r.returnId === ret.id && r.status === 'escalated')
    const inReviewStage = (REVIEW_STAGES as readonly string[]).includes(ret.stage)

    const relevant = inReviewStage || overrideFields.length > 0 || needsApproval.length > 0 || openHighIssues.length > 0 || escalated.length > 0
    if (!relevant) continue

    const reasons: { label: string; weight: number; kind: ReviewRow['reasonKind'] }[] = []

    if (ret.justSubmittedForReview) reasons.push({ label: 'Newly submitted — ready for review', weight: 120, kind: 'stage' })
    if (ret.stage === 'filing_rejected') reasons.push({ label: 'Previously rejected by IRS', weight: 100, kind: 'rejected' })
    if (escalated.length > 0) reasons.push({ label: 'Escalated by preparer', weight: 80, kind: 'escalated' })
    if (openHighIssues.length > 0) reasons.push({ label: `High-risk issue: ${openHighIssues[0].title}`, weight: 70, kind: 'risk' })
    if (overrideFields.length > 0) reasons.push({ label: `${overrideFields.length} manual correction${overrideFields.length > 1 ? 's' : ''} to review`, weight: 60, kind: 'correction' })
    if (ret.stage === 'changes_requested') reasons.push({ label: 'Resubmitted after changes', weight: 50, kind: 'stage' })

    const daysUntil = daysBetween(today, ret.deadline)
    if (daysUntil < 0) reasons.push({ label: `Overdue by ${-daysUntil} day${-daysUntil === 1 ? '' : 's'}`, weight: 55, kind: 'deadline' })
    else if (daysUntil <= 14) reasons.push({ label: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`, weight: 40 - daysUntil, kind: 'deadline' })

    if (warnings.length > 0) reasons.push({ label: `${warnings.length} unusual-value warning${warnings.length > 1 ? 's' : ''}`, weight: 30, kind: 'warning' })
    if (needsApproval.length > 0) reasons.push({ label: `${needsApproval.length} field${needsApproval.length > 1 ? 's' : ''} need approval`, weight: 25, kind: 'approval' })
    if (ret.riskLevel === 'high') reasons.push({ label: 'High-risk return', weight: 20, kind: 'risk' })

    if (reasons.length === 0) reasons.push({ label: 'Awaiting review', weight: 5, kind: 'stage' })
    reasons.sort((a, b) => b.weight - a.weight)

    rows.push({
      ret,
      score: reasons.reduce((s, r) => s + r.weight, 0),
      reason: reasons[0].label,
      reasonKind: reasons[0].kind,
      correctionCount: overrideFields.length,
      warningCount: warnings.length,
    })
  }

  return rows.sort((a, b) => b.score - a.score || daysBetween(DEMO_TODAY, a.ret.deadline) - daysBetween(DEMO_TODAY, b.ret.deadline))
}

// ---------------------------------------------------------------------------
// Reviewer actions
// ---------------------------------------------------------------------------

/** Approve a field and lock it. Locked values cannot be changed without reopening. */
export function approveField(fieldId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  let returnId = ''
  const fields = state.fields.map((f) => {
    if (f.id !== fieldId) return f
    returnId = f.returnId
    return { ...f, state: 'locked' as const, verifiedBy: byUserId, verifiedAt: now, lastChangedBy: byUserId, lastChangedAt: now }
  })
  state.updateState({ fields })
  pushAudit(returnId, byUserId, 'field_approved_locked', fieldId, 'Approved and locked field after review')
}

/** Reopen a locked field for editing (preparer action). */
export function reopenField(fieldId: string, byUserId: string) {
  const state = useDemoStore.getState()
  let returnId = ''
  const fields = state.fields.map((f) => {
    if (f.id !== fieldId || f.state !== 'locked') return f
    returnId = f.returnId
    return { ...f, state: 'needs_approval' as const, lastChangedBy: byUserId, lastChangedAt: new Date().toISOString() }
  })
  state.updateState({ fields })
  pushAudit(returnId, byUserId, 'field_reopened', fieldId, 'Reopened a locked field for review')
}

export function resolveIssue(issueId: string, byUserId: string) {
  const state = useDemoStore.getState()
  let returnId = ''
  const issues = state.issues.map((i) => {
    if (i.id !== issueId) return i
    returnId = i.returnId
    return { ...i, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
  })
  state.updateState({ issues })
  pushAudit(returnId, byUserId, 'issue_resolved', issueId, 'Reviewer marked issue as resolved')
}

export interface RequestChangesInput {
  returnId: string
  target?: { fieldId?: string; documentId?: string; issueId?: string }
  internalNote: string
  clientQuestion?: string
  byUserId: string
}

/**
 * Request changes: moves the return to "Changes requested", creates a preparer
 * task, records the reviewer's internal note (hidden from the client), and
 * optionally sends the client a simple, separate question.
 */
export function requestChanges(input: RequestChangesInput) {
  if (!input.internalNote.trim()) throw new Error('An internal note for the preparer is required.')
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const ret = state.returns.find((r) => r.id === input.returnId)
  if (!ret) return

  // 1. Move the return to changes_requested.
  const historyEntry: StageHistoryEntry = { stage: 'changes_requested', enteredAt: now, completedAt: null, completedBy: null }
  const returns = state.returns.map((r) =>
    r.id === input.returnId
      ? {
          ...r,
          stage: 'changes_requested' as const,
          nextAction: 'Address reviewer feedback',
          nextResponsibleRole: 'tax_preparer' as Role,
          justSubmittedForReview: false,
          updatedAt: now,
          stageHistory: [...r.stageHistory, historyEntry],
        }
      : r,
  )

  // 2. Preparer task carrying the internal wording.
  const task: Task = {
    id: `task-review-${input.returnId}-${Date.now()}`,
    returnId: input.returnId,
    title: 'Address reviewer change request',
    description: input.internalNote.trim(),
    status: 'open',
    assignedTo: ret.preparerId,
    createdBy: input.byUserId,
    dueDate: ret.deadline,
    priority: 'high',
    createdAt: now,
    completedAt: null,
  }

  state.updateState({ returns, tasks: [...state.tasks, task] })

  // 3. Internal reviewer note thread (hidden from the client).
  createThread({
    returnId: input.returnId,
    subject: 'Reviewer change request',
    authorId: input.byUserId,
    content: input.internalNote.trim(),
    participants: [input.byUserId, ret.preparerId],
    linkedDocumentId: input.target?.documentId,
    linkedFieldId: input.target?.fieldId,
    linkedIssueId: input.target?.issueId,
    visibility: 'internal_only',
  })

  // 4. Optional simple client-facing question (separate wording).
  if (input.clientQuestion?.trim()) {
    const client = state.clients.find((c) => c.id === ret.clientId)
    const participants = [ret.preparerId, ...(client?.userId ? [client.userId] : [])]
    createThread({
      returnId: input.returnId,
      subject: 'A quick question about your return',
      authorId: ret.preparerId,
      content: input.clientQuestion.trim(),
      participants,
      linkedDocumentId: input.target?.documentId,
      visibility: 'client_visible',
    })
  }

  pushAudit(input.returnId, input.byUserId, 'review_changes_requested', input.returnId, `Requested changes: ${input.internalNote.trim()}`)
}

/**
 * Approve the whole return: locks reviewed fields (manual corrections and
 * approval-required fields) and advances the return to client approval.
 */
export function approveReturn(returnId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const ret = state.returns.find((r) => r.id === returnId)
  if (!ret) return

  const fields = state.fields.map((f) => {
    if (f.returnId !== returnId) return f
    if (f.state === 'override' || f.state === 'needs_approval') {
      return { ...f, state: 'locked' as const, verifiedBy: byUserId, verifiedAt: now, lastChangedBy: byUserId, lastChangedAt: now }
    }
    return f
  })

  const clientRole: Role = ret.type === 'business' ? 'business_owner' : 'individual_taxpayer'
  const historyEntry: StageHistoryEntry = { stage: 'waiting_for_client_approval', enteredAt: now, completedAt: null, completedBy: null }
  const returns = state.returns.map((r) =>
    r.id === returnId
      ? {
          ...r,
          stage: 'waiting_for_client_approval' as const,
          nextAction: 'Client needs to review and approve the return',
          nextResponsibleRole: clientRole,
          blocker: null,
          justSubmittedForReview: false,
          updatedAt: now,
          stageHistory: [...r.stageHistory, historyEntry],
        }
      : r,
  )

  state.updateState({ fields, returns })
  pushAudit(returnId, byUserId, 'return_approved', returnId, 'Reviewer approved the return; reviewed fields locked')
}

/** Add an internal-only reviewer note to the return. */
export function addInternalReviewNote(returnId: string, content: string, byUserId: string): string | null {
  if (!content.trim()) return null
  const state = useDemoStore.getState()
  const ret = state.returns.find((r) => r.id === returnId)
  const threadId = createThread({
    returnId,
    subject: 'Reviewer note',
    authorId: byUserId,
    content: content.trim(),
    participants: [byUserId, ...(ret ? [ret.preparerId] : [])],
    visibility: 'internal_only',
  })
  return threadId
}

/** Items the reviewer should look at on a given return. */
export interface ReviewItem {
  id: string
  kind: 'correction' | 'approval' | 'duplicate' | 'received_doc' | 'warning'
  label: string
  detail: string
  fieldId?: string
  documentId?: string
}

export function buildReviewItems(
  returnId: string,
  fields: ReturnField[],
  documents: { id: string; name: string; status: string; returnId: string; uploadedAt: string | null }[],
): ReviewItem[] {
  const items: ReviewItem[] = []

  fields.filter((f) => f.returnId === returnId && f.state === 'override').forEach((f) =>
    items.push({ id: `corr-${f.id}`, kind: 'correction', label: `Manually corrected ${f.label}`, detail: f.correctionReason || 'Awaiting reviewer approval', fieldId: f.id }),
  )
  fields.filter((f) => f.returnId === returnId && f.state === 'needs_approval').forEach((f) =>
    items.push({ id: `appr-${f.id}`, kind: 'approval', label: `${f.label} requires review`, detail: 'Flagged for approval before filing', fieldId: f.id }),
  )
  documents.filter((d) => d.returnId === returnId && d.status === 'duplicate_warning').forEach((d) =>
    items.push({ id: `dup-${d.id}`, kind: 'duplicate', label: `Possible duplicate: ${d.name}`, detail: 'Confirm whether this is a duplicate', documentId: d.id }),
  )
  documents
    .filter((d) => d.returnId === returnId && d.status === 'received')
    .forEach((d) => items.push({ id: `recv-${d.id}`, kind: 'received_doc', label: `${d.name} recently received`, detail: 'Newly uploaded — review when convenient', documentId: d.id }))

  return items
}
