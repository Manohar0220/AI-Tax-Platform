/**
 * preparer-service.ts
 *
 * Manual preparer actions on a return. Nothing here runs automatically — each
 * function is invoked only when the preparer clicks an explicit action. Every
 * action updates the single shared return state so all roles/dashboards stay in
 * sync, and records an audit event.
 */
import type { ClientRequest, Role, AuditEvent, DocumentStatus } from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'
import { createThread } from '@/services/collaboration-service'
import { recordStageChange } from '@/services/status-service'

function clientRoleFor(returnId: string): Role {
  const ret = useDemoStore.getState().returns.find((r) => r.id === returnId)
  return ret?.type === 'business' ? 'business_owner' : 'individual_taxpayer'
}

function pushAudit(returnId: string, userId: string, action: string, target: string, details: string) {
  const state = useDemoStore.getState()
  const event: AuditEvent = {
    id: `audit-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    returnId, userId, action, target, details,
    timestamp: new Date().toISOString(),
  }
  state.updateState({ auditEvents: [...state.auditEvents, event] })
}

/** Move a return into "Waiting on client" and hand responsibility to the client. */
function handToClient(returnId: string, blocker: string) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const returns = state.returns.map((r) =>
    r.id === returnId
      ? {
          ...r,
          stage: 'waiting_on_client' as const,
          nextResponsibleRole: clientRoleFor(returnId),
          blocker,
          justOnboarded: false,
          updatedAt: now,
          stageHistory: r.stage === 'waiting_on_client'
            ? r.stageHistory
            : [...r.stageHistory, { stage: 'waiting_on_client' as const, enteredAt: now, completedAt: null, completedBy: null, reason: blocker }],
        }
      : r,
  )
  state.updateState({ returns })
}

export interface RequestDocumentInput {
  returnId: string
  byUserId: string
  title: string
  description: string
  linkedDocumentId?: string
  dueDate?: string | null
}

/**
 * Preparer requests a document from the client. Creates ONE request + ONE
 * client-visible conversation, marks the linked document as "Needed", sets the
 * return to Waiting on client, and records audit events.
 */
export function requestDocument(input: RequestDocumentInput): string {
  const state = useDemoStore.getState()
  const ret = state.returns.find((r) => r.id === input.returnId)
  if (!ret) return ''
  const now = new Date().toISOString()

  // 1. Create the client request.
  const request: ClientRequest = {
    id: `req-${input.returnId}-${Date.now()}`,
    returnId: input.returnId,
    clientId: ret.clientId,
    linkedDocumentId: input.linkedDocumentId,
    title: input.title,
    description: input.description,
    status: 'pending',
    requestedBy: input.byUserId,
    requestedAt: now,
    fulfilledAt: null,
    dueDate: input.dueDate ?? null,
  }

  // 2. Mark the linked document as Needed (only if it exists and isn't received).
  const documents = state.documents.map((d) => {
    if (d.id && d.id === input.linkedDocumentId && d.returnId === input.returnId) {
      const keep: DocumentStatus[] = ['received', 'verified', 'needs_review', 'processing']
      if (!keep.includes(d.status)) return { ...d, status: 'missing' as const }
    }
    return d
  })

  state.updateState({ requests: [...state.requests, request], documents })

  // 3. Client-visible conversation (createThread records its own audit).
  const client = state.clients.find((c) => c.id === ret.clientId)
  const participants = [input.byUserId, ...(client?.userId ? [client.userId] : [])]
  createThread({
    returnId: input.returnId,
    subject: input.title,
    authorId: input.byUserId,
    content: input.description,
    linkedDocumentId: input.linkedDocumentId,
    participants,
    visibility: 'client_visible',
  })

  // 4. Waiting on client + audit.
  handToClient(input.returnId, input.title)
  pushAudit(input.returnId, input.byUserId, 'document_requested', request.id, `Requested document: ${input.title}`)
  return request.id
}

export interface AskClientInput {
  returnId: string
  byUserId: string
  question: string
}

/**
 * Preparer asks the client a question. Creates ONE client-visible conversation
 * and sets the return to Waiting on client.
 */
export function askClient(input: AskClientInput): string {
  const state = useDemoStore.getState()
  const ret = state.returns.find((r) => r.id === input.returnId)
  if (!ret) return ''

  const client = state.clients.find((c) => c.id === ret.clientId)
  const participants = [input.byUserId, ...(client?.userId ? [client.userId] : [])]
  const threadId = createThread({
    returnId: input.returnId,
    subject: 'A question about your return',
    authorId: input.byUserId,
    content: input.question,
    participants,
    visibility: 'client_visible',
  })

  handToClient(input.returnId, 'Waiting for the client to answer a question')
  pushAudit(input.returnId, input.byUserId, 'client_question_asked', threadId, 'Asked the client a question')
  return threadId
}

/** Preparer adds an internal-only note (never visible to the client). */
export function addInternalNote(returnId: string, byUserId: string, content: string): string {
  const threadId = createThread({
    returnId,
    subject: 'Internal note',
    authorId: byUserId,
    content,
    participants: [byUserId],
    visibility: 'internal_only',
  })
  return threadId
}

/**
 * Preparer submits the return for reviewer review. Jumps straight to
 * ready_for_review and hands responsibility to the reviewer.
 */
export function submitForReview(returnId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const ret = state.returns.find((r) => r.id === returnId)
  if (!ret) return

  recordStageChange(returnId, 'ready_for_review', byUserId, 'Preparer submitted the return for review', {
    role: 'reviewer' as Role,
    keepBlocker: false,
  })

  // Clear the newly-onboarded flag; mark it newly submitted so the reviewer sees
  // it as a "New" item at the top of their queue.
  const returns = useDemoStore.getState().returns.map((r) =>
    r.id === returnId
      ? { ...r, justOnboarded: false, justSubmittedForReview: true, completionPercentage: Math.max(r.completionPercentage, 80) }
      : r,
  )
  useDemoStore.getState().updateState({ returns })
  pushAudit(returnId, byUserId, 'submitted_for_review', returnId, 'Submitted for reviewer review')
}
