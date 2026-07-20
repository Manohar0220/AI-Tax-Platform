import type { TaxReturn, User, AuditEvent, Role, ReturnStage } from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'
import { daysBetween, DEMO_TODAY } from './priority-service'

/** Nominal capacity (max active returns) per staff role. */
export const ROLE_CAPACITY: Partial<Record<Role, number>> = {
  tax_preparer: 30,
  reviewer: 50,
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

export interface StaffWorkload {
  user: User
  load: number
  capacity: number
  availability: number
  status: 'available' | 'busy' | 'overloaded'
}

function activeReturnsFor(user: User, returns: TaxReturn[]): number {
  return returns.filter((r) => {
    if (r.stage === 'filed') return false
    if (user.primaryRole === 'reviewer') return r.reviewerId === user.id
    return r.preparerId === user.id
  }).length
}

export function getStaffWorkload(users: User[], returns: TaxReturn[]): StaffWorkload[] {
  return users
    .filter((u) => u.firmId && (u.primaryRole === 'tax_preparer' || u.primaryRole === 'reviewer'))
    .map((user) => {
      const capacity = ROLE_CAPACITY[user.primaryRole] ?? 0
      const load = activeReturnsFor(user, returns)
      const availability = capacity - load
      const status: StaffWorkload['status'] =
        load > capacity ? 'overloaded' : load > capacity * 0.8 ? 'busy' : 'available'
      return { user, load, capacity, availability, status }
    })
    .sort((a, b) => b.load - a.load)
}

export function isOverloaded(user: User, returns: TaxReturn[], extra = 0): boolean {
  const capacity = ROLE_CAPACITY[user.primaryRole] ?? 0
  return activeReturnsFor(user, returns) + extra > capacity
}

const STAGE_ORDER: ReturnStage[] = [
  'collecting_information', 'waiting_on_client', 'ready_to_prepare', 'preparing',
  'ready_for_review', 'under_review', 'changes_requested', 'waiting_for_client_approval',
  'ready_to_file', 'filed', 'filing_rejected',
]

export interface FirmOverview {
  returnsByStage: { stage: ReturnStage; count: number }[]
  urgentDeadlines: TaxReturn[]
  blocked: TaxReturn[]
  /** Returns whose preparer is unassigned (flagged for assignment review). */
  flaggedAssignments: TaxReturn[]
  workload: StaffWorkload[]
  totalActive: number
}

export function getFirmOverview(returns: TaxReturn[], users: User[]): FirmOverview {
  const returnsByStage = STAGE_ORDER.map((stage) => ({
    stage,
    count: returns.filter((r) => r.stage === stage).length,
  })).filter((s) => s.count > 0)

  const urgentDeadlines = returns
    .filter((r) => r.stage !== 'filed' && daysBetween(DEMO_TODAY, r.deadline) <= 14)
    .sort((a, b) => daysBetween(DEMO_TODAY, a.deadline) - daysBetween(DEMO_TODAY, b.deadline))

  const blocked = returns.filter((r) => r.blocker && r.stage !== 'filed')

  const flaggedAssignments = returns.filter(
    (r) => r.stage !== 'filed' && !r.preparerId,
  )

  return {
    returnsByStage,
    urgentDeadlines,
    blocked,
    flaggedAssignments,
    workload: getStaffWorkload(users, returns),
    totalActive: returns.filter((r) => r.stage !== 'filed').length,
  }
}

export function reassignPreparer(returnId: string, newPreparerId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const name = state.users.find((u) => u.id === newPreparerId)?.name || newPreparerId
  const returns = state.returns.map((r) =>
    r.id === returnId ? { ...r, preparerId: newPreparerId, updatedAt: new Date().toISOString() } : r,
  )
  state.updateState({ returns })
  pushAudit(returnId, byUserId, 'preparer_reassigned', returnId, `Preparer reassigned to ${name}`)
}

export function reassignReviewer(returnId: string, newReviewerId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const name = state.users.find((u) => u.id === newReviewerId)?.name || newReviewerId
  const returns = state.returns.map((r) =>
    r.id === returnId ? { ...r, reviewerId: newReviewerId, updatedAt: new Date().toISOString() } : r,
  )
  state.updateState({ returns })
  pushAudit(returnId, byUserId, 'reviewer_reassigned', returnId, `Reviewer reassigned to ${name}`)
}

// ---------------------------------------------------------------------------
// Role capability matrix (read-only permissions summary)
// ---------------------------------------------------------------------------

export interface Capability {
  label: string
  roles: Partial<Record<Role, boolean>>
}

export const CAPABILITY_MATRIX: Capability[] = [
  { label: 'View assigned returns', roles: { tax_preparer: true, reviewer: true, firm_administrator: true, individual_taxpayer: true, business_owner: true } },
  { label: 'Edit / correct tax values', roles: { tax_preparer: true, reviewer: false, firm_administrator: false } },
  { label: 'Verify a field', roles: { tax_preparer: true, reviewer: true, firm_administrator: false } },
  { label: 'Approve & lock fields', roles: { tax_preparer: false, reviewer: true, firm_administrator: false } },
  { label: 'Approve a return', roles: { tax_preparer: false, reviewer: true, firm_administrator: false } },
  { label: 'Request changes', roles: { tax_preparer: false, reviewer: true, firm_administrator: false } },
  { label: 'Classify / flag documents', roles: { tax_preparer: true, reviewer: false, firm_administrator: false } },
  { label: 'Manage assignments & workload', roles: { tax_preparer: false, reviewer: false, firm_administrator: true } },
  { label: 'Send client messages', roles: { tax_preparer: true, reviewer: false, firm_administrator: false } },
]

export const CAPABILITY_ROLES: { role: Role; label: string }[] = [
  { role: 'tax_preparer', label: 'Preparer' },
  { role: 'reviewer', label: 'Reviewer' },
  { role: 'firm_administrator', label: 'Admin' },
]
