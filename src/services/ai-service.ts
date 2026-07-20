import type { AIRecommendation, AuditEvent, ConfidenceLevel, Issue } from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'
import { createThread } from './collaboration-service'
import { requestDocument } from './preparer-service'

/** Plain-language certainty labels — never surface a bare percentage. */
export function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'High confidence'
    case 'medium':
      return 'Needs review'
    case 'low':
      return 'Low confidence'
  }
}

export function confidenceVariant(level: ConfidenceLevel): 'success' | 'warning' | 'error' {
  return level === 'high' ? 'success' : level === 'medium' ? 'warning' : 'error'
}

/** Actions that can be safely undone (they do not overwrite return values). */
export function canUndo(rec: AIRecommendation): boolean {
  return rec.status === 'accepted' || rec.status === 'dismissed' || rec.status === 'escalated'
}

function pushAudit(returnId: string, userId: string, action: string, target: string, details: string) {
  const state = useDemoStore.getState()
  const event: AuditEvent = {
    id: `audit-${action}-${Date.now()}`,
    returnId,
    userId,
    action,
    target,
    details,
    timestamp: new Date().toISOString(),
  }
  state.updateState({ auditEvents: [...state.auditEvents, event] })
}

function setStatus(recId: string, next: AIRecommendation['status'], byUserId: string, extra: Partial<AIRecommendation> = {}) {
  const state = useDemoStore.getState()
  let prev: AIRecommendation['status'] = 'pending'
  let returnId = ''
  const recommendations = state.recommendations.map((r) => {
    if (r.id !== recId) return r
    prev = r.status
    returnId = r.returnId
    return { ...r, status: next, actedBy: byUserId, actedAt: new Date().toISOString(), ...extra }
  })
  state.updateState({ recommendations })
  return { prev, returnId }
}

/** Accept the recommendation. Never modifies a field value directly. */
export function acceptRecommendation(recId: string, byUserId: string) {
  const rec = useDemoStore.getState().recommendations.find((r) => r.id === recId)
  const { prev, returnId } = setStatus(recId, 'accepted', byUserId)
  pushAudit(returnId, byUserId, 'ai_recommendation_accepted', recId, `Accepted "${rec?.title}" (${prev} → accepted)`)
}

/** Dismiss the recommendation. A reason is required. */
export function dismissRecommendation(recId: string, reason: string, byUserId: string) {
  if (!reason.trim()) throw new Error('A dismissal reason is required.')
  const rec = useDemoStore.getState().recommendations.find((r) => r.id === recId)
  const { prev, returnId } = setStatus(recId, 'dismissed', byUserId, { dismissReason: reason.trim() })
  pushAudit(returnId, byUserId, 'ai_recommendation_dismissed', recId, `Dismissed "${rec?.title}" — ${reason.trim()} (${prev} → dismissed)`)
}

/** Escalate to the reviewer: opens an issue assigned to the reviewer. */
export function escalateRecommendation(recId: string, byUserId: string, note?: string): Issue | null {
  const state = useDemoStore.getState()
  const rec = state.recommendations.find((r) => r.id === recId)
  if (!rec) return null
  const ret = state.returns.find((r) => r.id === rec.returnId)
  const reviewerId = ret?.reviewerId || 'user-daniel'

  const issue: Issue = {
    id: `issue-ai-${recId}-${Date.now()}`,
    returnId: rec.returnId,
    documentId: rec.documentId,
    fieldId: rec.fieldId,
    title: `Reviewer input needed: ${rec.title}`,
    description: note?.trim() || rec.description,
    status: 'open',
    priority: 'high',
    assignedTo: reviewerId,
    createdBy: byUserId,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  }
  state.updateState({ issues: [...state.issues, issue] })

  const { prev } = setStatus(recId, 'escalated', byUserId)
  pushAudit(rec.returnId, byUserId, 'ai_recommendation_escalated', recId, `Escalated "${rec.title}" to reviewer (${prev} → escalated)`)
  return issue
}

/** Ask the client: opens a client-visible thread about the recommendation. */
export function askClientAboutRecommendation(recId: string, byUserId: string): string | null {
  const state = useDemoStore.getState()
  const rec = state.recommendations.find((r) => r.id === recId)
  if (!rec) return null
  const ret = state.returns.find((r) => r.id === rec.returnId)
  const client = state.clients.find((c) => c.id === ret?.clientId)
  const clientUserId = client?.userId
  const participants = [byUserId, ...(clientUserId ? [clientUserId] : [])]

  const threadId = createThread({
    returnId: rec.returnId,
    subject: `Question: ${rec.title}`,
    authorId: byUserId,
    content: rec.suggestedAction,
    participants,
    linkedDocumentId: rec.documentId,
    linkedFieldId: rec.fieldId,
    visibility: 'client_visible',
  })

  pushAudit(rec.returnId, byUserId, 'ai_recommendation_ask_client', recId, `Asked the client about "${rec.title}"`)
  return threadId
}

/**
 * Request the missing document from the client based on the recommendation.
 * Runs the full request flow (creates a client request + client-visible thread,
 * marks the linked document as needed, and hands the return to the client) and
 * marks the recommendation as acted on.
 */
export function requestDocumentFromRecommendation(recId: string, byUserId: string): string | null {
  const state = useDemoStore.getState()
  const rec = state.recommendations.find((r) => r.id === recId)
  if (!rec) return null

  const requestId = requestDocument({
    returnId: rec.returnId,
    byUserId,
    title: rec.title,
    description: rec.suggestedAction,
    linkedDocumentId: rec.documentId,
  })

  const { prev } = setStatus(recId, 'accepted', byUserId)
  pushAudit(rec.returnId, byUserId, 'ai_recommendation_requested_document', recId, `Requested the document for "${rec.title}" (${prev} → accepted)`)
  return requestId
}

/** Undo a safe prior action, returning the recommendation to pending. */
export function undoRecommendation(recId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const rec = state.recommendations.find((r) => r.id === recId)
  if (!rec || !canUndo(rec)) return
  const { prev, returnId } = setStatus(recId, 'pending', byUserId, { dismissReason: undefined })
  pushAudit(returnId, byUserId, 'ai_recommendation_undo', recId, `Undid ${prev} on "${rec.title}" (${prev} → pending)`)
}
