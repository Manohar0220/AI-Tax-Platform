/**
 * onboarding-finalize.ts
 *
 * Called once when a client completes onboarding. For the two answer-driven
 * demo returns (Manohar → RET-1001, Alex → RET-2001) the preset workflow has
 * already been stripped by `applyCleanSlate`, so all this needs to do is move
 * the return into "Ready for preparer review" and flag it as newly onboarded so
 * the preparer sees it at the top of their list.
 *
 * It intentionally creates NO requests, questions, conversations, or blockers —
 * every visible workflow event happens later, only after a manual user action.
 */

import type { OnboardingAnswers } from '@/store/onboarding-store'
import { useDemoStore } from '@/store/demo-store'
import { recordStageChange } from '@/services/status-service'
import type { Role, AuditEvent } from '@/domain/types'

/** Map a userId to the returnId that belongs to that client. */
function getReturnIdForUser(userId: string): string | null {
  const state = useDemoStore.getState()
  const client = state.clients.find((c) => c.userId === userId)
  if (!client) return null
  const ret = state.returns.find((r) => r.clientId === client.id)
  return ret?.id ?? null
}

function pushAudit(returnId: string, userId: string, details: string) {
  const state = useDemoStore.getState()
  const event: AuditEvent = {
    id: `audit-onboarding-${Date.now()}`,
    returnId, userId,
    action: 'onboarding_completed',
    target: returnId,
    details,
    timestamp: new Date().toISOString(),
  }
  state.updateState({ auditEvents: [...state.auditEvents, event] })
}

// The exact next-action wording the client sees after onboarding.
const READY_NEXT_ACTION = 'Your tax preparer will review the information you submitted.'

export function finalizeOnboarding(userId: string, _answers: OnboardingAnswers) {
  void _answers
  const returnId = getReturnIdForUser(userId)
  if (!returnId) return

  const state = useDemoStore.getState()
  const ret = state.returns.find((r) => r.id === returnId)
  if (!ret) return

  // ── Move to "Ready for preparer review" and hand off to the preparer ───────
  if (ret.stage === 'collecting_information' || ret.stage === 'waiting_on_client') {
    recordStageChange(returnId, 'ready_to_prepare', userId, 'Client completed onboarding questionnaire', {
      nextAction: READY_NEXT_ACTION,
      role: 'tax_preparer' as Role,
      keepBlocker: false,
    })
  }

  // ── Flag as newly onboarded so it surfaces at the top of the preparer list ─
  const returns = useDemoStore.getState().returns.map((r) =>
    r.id === returnId
      ? { ...r, justOnboarded: true, blocker: null, nextAction: READY_NEXT_ACTION, nextResponsibleRole: 'tax_preparer' as Role }
      : r,
  )
  useDemoStore.getState().updateState({ returns })

  pushAudit(returnId, userId, 'Client completed onboarding. Return moved to Ready for preparer review.')
}
