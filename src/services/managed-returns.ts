/**
 * managed-returns.ts
 *
 * The two demo clients whose workflow must happen entirely step-by-step:
 *   • RET-1001 — Manohar (Individual Taxpayer, user-sarah)
 *   • RET-2001 — Alex    (Business Owner,      user-alex)
 *
 * For these two returns we strip ALL preset workflow activity (requests,
 * questions, conversations, internal notes, blockers, "waiting on client"
 * status, task assignments, review decisions) so that nothing appears until a
 * real user performs an action during the demo.
 *
 * We KEEP the fake source documents, return fields, AI recommendations and
 * document metadata so they are available for later review — we simply do not
 * activate any requests/conversations automatically. AI recommendations are
 * reset to "pending" (available, not yet acted on).
 *
 * All other fake clients/returns are left untouched.
 *
 * This is a pure function — it never touches the store — so it is safe to run
 * inside the seed/reset path.
 */
import type { DemoState, TaxReturn, Role } from '@/domain/types'

export const MANAGED_RETURN_IDS = ['RET-1001', 'RET-2001'] as const
export const MANAGED_CLIENT_USER_IDS = ['user-sarah', 'user-alex'] as const

const MANAGED = new Set<string>(MANAGED_RETURN_IDS)

export function isManagedReturn(returnId: string | undefined | null): boolean {
  return !!returnId && MANAGED.has(returnId)
}

const MANAGED_USERS = new Set<string>(MANAGED_CLIENT_USER_IDS)

/**
 * True only for the two demo clients (Manohar, Alex) whose experience is gated
 * behind onboarding. Other client users (e.g. a preparer's personal return)
 * are never forced through onboarding.
 */
export function isManagedClientUser(userId: string | undefined | null): boolean {
  return !!userId && MANAGED_USERS.has(userId)
}

/** Reset a managed return to a clean, pre-onboarding state. */
function cleanReturn(ret: TaxReturn): TaxReturn {
  const clientRole: Role = ret.type === 'business' ? 'business_owner' : 'individual_taxpayer'
  return {
    ...ret,
    stage: 'collecting_information',
    blocker: null,
    nextAction: 'Complete your intake questionnaire to get started.',
    nextResponsibleRole: clientRole,
    completionPercentage: 0,
    justOnboarded: false,
    stageHistory: [
      { stage: 'collecting_information', enteredAt: ret.createdAt, completedAt: null, completedBy: null },
    ],
    updatedAt: ret.createdAt,
  }
}

/**
 * Produce a state where the two managed returns start with no preset workflow.
 * Pure: returns a new state object; does not mutate the input.
 */
export function applyCleanSlate(state: DemoState): DemoState {
  // 1. Returns → clean pre-onboarding state.
  const returns = state.returns.map((r) => (MANAGED.has(r.id) ? cleanReturn(r) : r))

  // 2. Drop all preset requests / tasks for these returns.
  const requests = state.requests.filter((r) => !MANAGED.has(r.returnId))
  const tasks = state.tasks.filter((t) => !MANAGED.has(t.returnId))

  // 3. Drop all preset conversations (and their messages) for these returns.
  const droppedThreadIds = new Set(
    state.threads.filter((t) => MANAGED.has(t.returnId)).map((t) => t.id),
  )
  const threads = state.threads.filter((t) => !MANAGED.has(t.returnId))
  const messages = state.messages.filter((m) => !droppedThreadIds.has(m.threadId))

  // 4. Reset AI recommendations to "pending" (kept available, no decisions).
  const recommendations = state.recommendations.map((rec) =>
    MANAGED.has(rec.returnId)
      ? { ...rec, status: 'pending' as const, actedBy: undefined, actedAt: undefined, dismissReason: undefined }
      : rec,
  )

  // 5. Deactivate preset issues for these returns (kept as data, not shown as
  //    active work). They can be re-raised through manual actions.
  const issues = state.issues.map((i) =>
    MANAGED.has(i.returnId) ? { ...i, status: 'dismissed' as const } : i,
  )

  // 6. Clear preset "problem" document statuses (blurry/duplicate) but keep the
  //    documents. Missing docs stay missing (hidden client-side until requested).
  const documents = state.documents.map((d) => {
    if (!MANAGED.has(d.returnId)) return d
    if (d.status === 'needs_replacement' || d.status === 'duplicate_warning') {
      return { ...d, status: 'received' as const }
    }
    return d
  })

  return { ...state, returns, requests, tasks, threads, messages, recommendations, issues, documents }
}

/**
 * Client-facing document visibility for managed returns.
 * A "missing" document should only be visible to the client once the preparer
 * has actually created a request that references it. Everything else (received,
 * verified, etc.) is always part of the document history.
 */
export function isClientVisibleDoc(
  status: string,
  documentId: string,
  requestedDocIds: Set<string>,
): boolean {
  if (status !== 'missing') return true
  return requestedDocIds.has(documentId)
}
