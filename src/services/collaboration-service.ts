import type {
  Message,
  MessageThread,
  MessageVisibility,
  ClientRequest,
  Task,
  AuditEvent,
  Role,
  User,
} from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'
import { isManagedReturn } from '@/services/managed-returns'

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const STAFF_ROLES: Role[] = [
  'tax_preparer',
  'reviewer',
  'firm_administrator',
]

export function isStaffRole(role: Role | null): boolean {
  return role !== null && STAFF_ROLES.includes(role)
}

export function isStaffUser(userId: string, users: User[]): boolean {
  const user = users.find((u) => u.id === userId)
  return user ? isStaffRole(user.primaryRole) : false
}

// ---------------------------------------------------------------------------
// Visibility rules (the core privacy logic — heavily tested)
// ---------------------------------------------------------------------------

/** A message's effective visibility: its own, or its thread's when unset. */
export function effectiveMessageVisibility(
  message: Message,
  thread: MessageThread,
): MessageVisibility {
  return message.visibility ?? thread.visibility
}

/** Whether a role may open a thread at all. */
export function canRoleSeeThread(thread: MessageThread, role: Role | null): boolean {
  if (thread.visibility === 'internal_only') return isStaffRole(role)
  return true
}

/** Whether a role may read an individual message within a thread. */
export function canRoleSeeMessage(
  message: Message,
  thread: MessageThread,
  role: Role | null,
): boolean {
  if (!canRoleSeeThread(thread, role)) return false
  if (isStaffRole(role)) return true
  return effectiveMessageVisibility(message, thread) === 'client_visible'
}

/** Threads a given role is allowed to see, optionally scoped to a return. */
export function filterThreadsForRole(
  threads: MessageThread[],
  role: Role | null,
  returnId?: string,
): MessageThread[] {
  return threads.filter(
    (t) =>
      (!returnId || t.returnId === returnId) && canRoleSeeThread(t, role),
  )
}

/** Messages within a thread that a given role is allowed to read. */
export function filterMessagesForRole(
  messages: Message[],
  thread: MessageThread,
  role: Role | null,
): Message[] {
  return messages
    .filter((m) => m.threadId === thread.id && canRoleSeeMessage(m, thread, role))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
}

// ---------------------------------------------------------------------------
// Next-action ownership
// ---------------------------------------------------------------------------

/**
 * Whose response is required next on a thread. Uses the explicit override when
 * present, otherwise derives it from the last message: after staff writes, it is
 * the client's turn, and vice versa.
 */
export function getThreadNextActionOwner(
  thread: MessageThread,
  messages: Message[],
  users: User[],
): 'client' | 'staff' {
  if (thread.nextActionOwner) return thread.nextActionOwner

  const threadMessages = messages
    .filter((m) => m.threadId === thread.id)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))

  const last = threadMessages[threadMessages.length - 1]
  if (!last) return 'staff'
  return isStaffUser(last.senderId, users) ? 'client' : 'staff'
}

/** Whose action is required to move a request forward. */
export function getRequestNextActionOwner(request: ClientRequest): 'client' | 'staff' {
  return request.status === 'pending' || request.status === 'overdue'
    ? 'client'
    : 'staff'
}

// ---------------------------------------------------------------------------
// Mutations (persisted through the demo store)
// ---------------------------------------------------------------------------

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

export interface PostMessageOptions {
  threadId: string
  senderId: string
  content: string
  visibility?: MessageVisibility
}

/** Append a message (or internal note) to a thread and update its state. */
export function postMessage({ threadId, senderId, content, visibility }: PostMessageOptions): Message {
  const state = useDemoStore.getState()
  const thread = state.threads.find((t) => t.id === threadId)
  const now = new Date().toISOString()

  const message: Message = {
    id: `msg-${threadId}-${Date.now()}`,
    threadId,
    senderId,
    content: content.trim(),
    sentAt: now,
    readBy: [senderId],
    ...(visibility ? { visibility } : {}),
  }

  const senderIsStaff = isStaffUser(senderId, state.users)
  // A client-visible message flips the turn to the other side. An internal note
  // does not change whose turn it is with the client.
  const isInternal = visibility === 'internal_only'

  const threads = state.threads.map((t) => {
    if (t.id !== threadId) return t
    return {
      ...t,
      lastMessageAt: now,
      nextActionOwner: isInternal
        ? t.nextActionOwner
        : senderIsStaff
          ? ('client' as const)
          : ('staff' as const),
    }
  })

  state.updateState({
    messages: [...state.messages, message],
    threads,
  })

  if (thread) {
    pushAudit(
      thread.returnId,
      senderId,
      isInternal ? 'internal_note_added' : 'message_sent',
      threadId,
      isInternal ? 'Added an internal note' : `Sent a message in "${thread.subject}"`,
    )
  }

  // When a client replies on an answer-driven demo return that is waiting on
  // them, responsibility returns to the preparer and the return moves forward.
  if (thread && !senderIsStaff && !isInternal && isManagedReturn(thread.returnId)) {
    const latest = useDemoStore.getState()
    const ret = latest.returns.find((r) => r.id === thread.returnId)
    if (ret && ret.stage === 'waiting_on_client') {
      const returns = latest.returns.map((r) =>
        r.id === ret.id
          ? {
              ...r,
              stage: 'ready_to_prepare' as const,
              nextResponsibleRole: 'tax_preparer' as Role,
              blocker: null,
              nextAction: 'Review the client’s response and continue preparation.',
              updatedAt: now,
              stageHistory: [
                ...r.stageHistory,
                { stage: 'ready_to_prepare' as const, enteredAt: now, completedAt: null, completedBy: null, reason: 'Client responded' },
              ],
            }
          : r,
      )
      latest.updateState({ returns })
      pushAudit(thread.returnId, senderId, 'client_responded', thread.id, 'Client responded — returned to the preparer')
    }
  }

  return message
}

export interface CreateThreadOptions {
  returnId: string
  subject: string
  authorId: string
  content: string
  linkedDocumentId?: string
  linkedIssueId?: string
  linkedFieldId?: string
  participants: string[]
  visibility?: MessageVisibility
}

/** Create a new thread with an opening message. Returns the new thread id. */
export function createThread(opts: CreateThreadOptions): string {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const threadId = `thread-${Date.now()}`
  const visibility: MessageVisibility = opts.visibility ?? 'client_visible'

  const thread: MessageThread = {
    id: threadId,
    returnId: opts.returnId,
    subject: opts.subject,
    linkedDocumentId: opts.linkedDocumentId,
    linkedIssueId: opts.linkedIssueId,
    linkedFieldId: opts.linkedFieldId,
    visibility,
    participants: opts.participants,
    createdAt: now,
    lastMessageAt: now,
  }

  const message: Message = {
    id: `msg-${threadId}-0`,
    threadId,
    senderId: opts.authorId,
    content: opts.content.trim(),
    sentAt: now,
    readBy: [opts.authorId],
  }

  state.updateState({
    threads: [...state.threads, thread],
    messages: [...state.messages, message],
  })

  pushAudit(opts.returnId, opts.authorId, 'thread_created', threadId, `Started a new conversation: "${opts.subject}"`)
  return threadId
}

/** Explicitly set whose turn it is on a thread. */
export function setThreadNextActionOwner(threadId: string, owner: 'client' | 'staff', byUserId: string) {
  const state = useDemoStore.getState()
  const thread = state.threads.find((t) => t.id === threadId)
  const threads = state.threads.map((t) => (t.id === threadId ? { ...t, nextActionOwner: owner } : t))
  state.updateState({ threads })
  if (thread) {
    pushAudit(thread.returnId, byUserId, 'next_action_reassigned', threadId, `Next action assigned to ${owner}`)
  }
}

export function resolveRequest(requestId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  let returnId = ''
  const requests = state.requests.map((r) => {
    if (r.id !== requestId) return r
    returnId = r.returnId
    return { ...r, status: 'fulfilled' as const, fulfilledAt: now }
  })
  state.updateState({ requests })
  pushAudit(returnId, byUserId, 'request_resolved', requestId, 'Marked request as complete')
}

export function reopenRequest(requestId: string, byUserId: string) {
  const state = useDemoStore.getState()
  let returnId = ''
  const requests = state.requests.map((r) => {
    if (r.id !== requestId) return r
    returnId = r.returnId
    return { ...r, status: 'pending' as const, fulfilledAt: null }
  })
  state.updateState({ requests })
  pushAudit(returnId, byUserId, 'request_reopened', requestId, 'Reopened request')
}

/** Create a follow-up task from a request and assign it to a staff member. */
export function assignTaskFromRequest(requestId: string, assignedTo: string, byUserId: string): Task | null {
  const state = useDemoStore.getState()
  const request = state.requests.find((r) => r.id === requestId)
  if (!request) return null

  const now = new Date().toISOString()
  const task: Task = {
    id: `task-${requestId}-${Date.now()}`,
    returnId: request.returnId,
    title: `Follow up: ${request.title}`,
    description: request.description,
    status: 'open',
    assignedTo,
    createdBy: byUserId,
    dueDate: request.dueDate,
    priority: 'medium',
    createdAt: now,
    completedAt: null,
  }

  state.updateState({ tasks: [...state.tasks, task] })
  pushAudit(request.returnId, byUserId, 'task_assigned', task.id, `Created task "${task.title}"`)
  return task
}
