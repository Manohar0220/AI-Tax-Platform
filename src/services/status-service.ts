import type {
  ReturnStage, TaxReturn, User, Client, Role, AuditEvent, StageHistoryEntry,
} from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'

// ---------------------------------------------------------------------------
// Single source of truth for stage metadata
// ---------------------------------------------------------------------------

interface StageMeta {
  /** Operational label for staff. */
  label: string
  /** Friendly label for clients. */
  clientLabel: string
  /** Operational one-liner for staff. */
  staffExplanation: string
  /** Plain-language explanation for clients. */
  clientExplanation: string
  /** When the client is the responsible party, what they should do. */
  clientActionHint?: string
  /** 1-based position in the lifecycle. */
  index: number
}

export const STAGE_ORDER: ReturnStage[] = [
  'collecting_information', 'waiting_on_client', 'ready_to_prepare', 'preparing',
  'ready_for_review', 'under_review', 'changes_requested', 'waiting_for_client_approval',
  'ready_to_file', 'filed', 'filing_rejected',
]

export const STAGE_META: Record<ReturnStage, StageMeta> = {
  collecting_information: {
    label: 'Collecting information', clientLabel: 'Gathering your documents',
    staffExplanation: 'Collecting the documents and answers needed to begin preparation.',
    clientExplanation: "We're gathering the documents and answers needed to start your return.",
    clientActionHint: 'upload the documents your preparer requested', index: 1,
  },
  waiting_on_client: {
    label: 'Waiting on client', clientLabel: 'Waiting for you',
    staffExplanation: 'Blocked pending information or documents from the client.',
    clientExplanation: 'Your preparer needs something from you before continuing.',
    clientActionHint: 'respond to your preparer’s request', index: 2,
  },
  ready_to_prepare: {
    label: 'Ready to prepare', clientLabel: 'Ready to start',
    staffExplanation: 'All inputs received; ready to begin preparation.',
    clientExplanation: 'We have what we need and will begin your return shortly.', index: 3,
  },
  preparing: {
    label: 'Preparing', clientLabel: 'Being prepared',
    staffExplanation: 'Return is actively being prepared.',
    clientExplanation: 'Your tax preparer is working on your return.', index: 4,
  },
  ready_for_review: {
    label: 'Ready for review', clientLabel: 'Being checked',
    staffExplanation: 'Preparation complete; awaiting reviewer pickup.',
    clientExplanation: 'Your return is complete and waiting for a senior review.', index: 5,
  },
  under_review: {
    label: 'Under review', clientLabel: 'Being reviewed',
    staffExplanation: 'Reviewer is checking calculations, corrections, and risk items.',
    clientExplanation: 'A senior reviewer is checking your return for accuracy.', index: 6,
  },
  changes_requested: {
    label: 'Changes requested', clientLabel: 'Being updated',
    staffExplanation: 'Reviewer returned items to the preparer for changes.',
    clientExplanation: 'The reviewer asked for updates and your preparer is making them.', index: 7,
  },
  waiting_for_client_approval: {
    label: 'Waiting for client approval', clientLabel: 'Ready for your approval',
    staffExplanation: 'Review complete; awaiting the client’s approval to file.',
    clientExplanation: 'Your return is ready for you to review and approve.',
    clientActionHint: 'review the summary and approve your return', index: 8,
  },
  ready_to_file: {
    label: 'Ready to file', clientLabel: 'About to be filed',
    staffExplanation: 'Approved by the client; ready to submit.',
    clientExplanation: 'You approved your return and it is ready to be filed.', index: 9,
  },
  filed: {
    label: 'Filed', clientLabel: 'Filed',
    staffExplanation: 'Submitted to the tax authority.',
    clientExplanation: 'Your return has been filed. No further action is needed.', index: 10,
  },
  filing_rejected: {
    label: 'Filing rejected', clientLabel: 'Needs attention',
    staffExplanation: 'Rejected by the tax authority; needs correction and refiling.',
    clientExplanation: 'The filing was rejected and your preparer is resolving it.', index: 11,
  },
}

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

export const VALID_TRANSITIONS: Record<ReturnStage, ReturnStage[]> = {
  collecting_information: ['ready_to_prepare', 'waiting_on_client'],
  waiting_on_client: ['collecting_information', 'ready_to_prepare'],
  ready_to_prepare: ['preparing'],
  preparing: ['ready_for_review'],
  ready_for_review: ['under_review'],
  under_review: ['changes_requested', 'waiting_for_client_approval'],
  changes_requested: ['preparing', 'under_review'],
  waiting_for_client_approval: ['ready_to_file'],
  ready_to_file: ['filed', 'filing_rejected'],
  filed: [],
  filing_rejected: ['preparing'],
}

export function canTransition(from: ReturnStage, to: ReturnStage): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidNextStages(from: ReturnStage): ReturnStage[] {
  return VALID_TRANSITIONS[from] ?? []
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

/** Default next action + responsible role applied when a return enters a stage. */
function stageDefaults(stage: ReturnStage): { nextAction: string; role: Role } {
  const map: Record<ReturnStage, { nextAction: string; role: Role }> = {
    collecting_information: { nextAction: 'Collect remaining documents', role: 'tax_preparer' },
    waiting_on_client: { nextAction: 'Waiting for information from the client', role: 'individual_taxpayer' },
    ready_to_prepare: { nextAction: 'Begin preparing the return', role: 'tax_preparer' },
    preparing: { nextAction: 'Complete return preparation', role: 'tax_preparer' },
    ready_for_review: { nextAction: 'Begin review', role: 'reviewer' },
    under_review: { nextAction: 'Complete the review', role: 'reviewer' },
    changes_requested: { nextAction: 'Address reviewer feedback', role: 'tax_preparer' },
    waiting_for_client_approval: { nextAction: 'Client to review and approve', role: 'individual_taxpayer' },
    ready_to_file: { nextAction: 'File the return', role: 'tax_preparer' },
    filed: { nextAction: 'No action needed', role: 'tax_preparer' },
    filing_rejected: { nextAction: 'Fix the rejection and refile', role: 'tax_preparer' },
  }
  return map[stage]
}

/**
 * Apply a stage change: closes the current history entry, opens a new one with the
 * reason, updates next action/owner, and writes an audit event capturing the
 * previous stage, new stage, user, date, and reason. Not validated — used by the
 * curated role workflows.
 */
export function recordStageChange(
  returnId: string,
  to: ReturnStage,
  byUserId: string,
  reason: string,
  overrides?: { nextAction?: string; role?: Role; keepBlocker?: boolean },
) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  const ret = state.returns.find((r) => r.id === returnId)
  if (!ret) return
  const from = ret.stage
  const defaults = stageDefaults(to)

  const history = ret.stageHistory.map((h, i) =>
    i === ret.stageHistory.length - 1 && !h.completedAt ? { ...h, completedAt: now, completedBy: byUserId } : h,
  )
  const newEntry: StageHistoryEntry = { stage: to, enteredAt: now, completedAt: null, completedBy: null, reason }

  const returns = state.returns.map((r) =>
    r.id === returnId
      ? {
          ...r,
          stage: to,
          nextAction: overrides?.nextAction ?? defaults.nextAction,
          nextResponsibleRole: overrides?.role ?? defaults.role,
          blocker: overrides?.keepBlocker ? r.blocker : (to === 'waiting_on_client' || to === 'collecting_information' ? r.blocker : null),
          updatedAt: now,
          stageHistory: [...history, newEntry],
        }
      : r,
  )
  state.updateState({ returns })
  pushAudit(returnId, byUserId, 'stage_changed', returnId, `${STAGE_META[from].label} → ${STAGE_META[to].label}${reason ? ` — ${reason}` : ''}`)
}

/** Validated transition. Throws when the move is not allowed. */
export function transitionStage(returnId: string, to: ReturnStage, byUserId: string, reason: string) {
  const state = useDemoStore.getState()
  const ret = state.returns.find((r) => r.id === returnId)
  if (!ret) throw new Error('Return not found.')
  if (!canTransition(ret.stage, to)) {
    throw new Error(`Invalid transition: ${STAGE_META[ret.stage].label} → ${STAGE_META[to].label}.`)
  }
  recordStageChange(returnId, to, byUserId, reason)
}

// ---------------------------------------------------------------------------
// Audience-aware status descriptor (one status, different detail per audience)
// ---------------------------------------------------------------------------

export type StatusAudience = 'client' | 'staff'

const CLIENT_ROLES: Role[] = ['individual_taxpayer', 'business_owner']

export interface StatusDescriptor {
  stage: ReturnStage
  index: number
  totalStages: number
  label: string
  explanation: string
  completedStepLabels: string[]
  nextActionText: string
  nextResponsibleRole: Role
  nextResponsiblePerson: string
  blocker: string | null
  deadline: string
  showDeadline: boolean
}

function responsiblePerson(ret: TaxReturn, users: User[], clients: Client[]): string {
  if (ret.nextResponsibleRole === 'reviewer') return users.find((u) => u.id === ret.reviewerId)?.name || 'Reviewer'
  if (ret.nextResponsibleRole === 'tax_preparer') return users.find((u) => u.id === ret.preparerId)?.name || 'Preparer'
  if (CLIENT_ROLES.includes(ret.nextResponsibleRole)) return getReturnClientName(ret, clients)
  return ret.nextResponsibleRole.replace(/_/g, ' ')
}

export function getStatusDescriptor(
  ret: TaxReturn,
  audience: StatusAudience,
  users: User[],
  clients: Client[],
): StatusDescriptor {
  const meta = STAGE_META[ret.stage]
  const clientResponsible = CLIENT_ROLES.includes(ret.nextResponsibleRole)
  const completedStepLabels = ret.stageHistory
    .filter((h) => h.completedAt)
    .map((h) => STAGE_META[h.stage]?.label || h.stage)

  let nextActionText: string
  let showDeadline: boolean

  if (audience === 'client') {
    nextActionText = clientResponsible
      ? `Waiting for you — ${meta.clientActionHint ?? 'complete the requested step'}.`
      : 'No action needed right now — your tax team is handling the next step.'
    showDeadline = clientResponsible || ret.stage === 'waiting_for_client_approval'
  } else {
    // Operational wording: action + deadline + blocker context.
    const parts = [ret.nextAction, `due ${ret.deadline}`]
    if (ret.blocker) parts.push('return blocked')
    nextActionText = `${meta.label} — ${parts.join(', ')}`
    showDeadline = true
  }

  return {
    stage: ret.stage,
    index: meta.index,
    totalStages: STAGE_ORDER.length,
    label: audience === 'client' ? meta.clientLabel : meta.label,
    explanation: audience === 'client' ? meta.clientExplanation : meta.staffExplanation,
    completedStepLabels,
    nextActionText,
    nextResponsibleRole: ret.nextResponsibleRole,
    nextResponsiblePerson: responsiblePerson(ret, users, clients),
    blocker: ret.blocker,
    deadline: ret.deadline,
    showDeadline,
  }
}
