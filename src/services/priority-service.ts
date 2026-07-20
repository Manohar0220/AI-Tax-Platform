import type { TaxReturn, Issue, ClientRequest } from '@/domain/types'

/**
 * Reference "today" for the demo. The seed and generated data cluster around
 * early 2026 with deadlines in March–April 2026, so we anchor deadline math to a
 * date that produces a realistic mix of overdue and upcoming work.
 */
export const DEMO_TODAY = '2026-03-20'

/** Returns due within this many days count as "due soon". */
export const DUE_SOON_DAYS = 14

export interface PriorityReason {
  label: string
  weight: number
  kind: 'rejection' | 'overdue' | 'review' | 'risk' | 'client' | 'blocker' | 'deadline' | 'waiting' | 'stage' | 'none'
}

export interface PriorityResult {
  score: number
  reasons: PriorityReason[]
  /** The single most important reason, shown in the queue. */
  topReason: string
  topKind: PriorityReason['kind']
}

export interface PriorityContext {
  today?: string
  issues?: Issue[]
  requests?: ClientRequest[]
}

/** Whole days from `from` to `to` (negative when `to` is before `from`). */
export function daysBetween(from: string, to: string): number {
  const a = new Date(from.slice(0, 10) + 'T00:00:00Z').getTime()
  const b = new Date(to.slice(0, 10) + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * Compute a priority score and human-readable reasons for a single return.
 * Higher score = more urgent. Every return receives at least one reason, so the
 * queue can always explain its ranking.
 */
export function computePriority(ret: TaxReturn, ctx: PriorityContext = {}): PriorityResult {
  const today = ctx.today ?? DEMO_TODAY
  const issues = ctx.issues ?? []
  const requests = ctx.requests ?? []
  const reasons: PriorityReason[] = []

  const isFiled = ret.stage === 'filed'
  const daysUntil = daysBetween(today, ret.deadline)

  // Filing rejection — the most urgent state, above even a deeply overdue return.
  if (ret.stage === 'filing_rejected') {
    reasons.push({ label: 'Filing rejected', weight: 130, kind: 'rejection' })
  }

  // Deadline pressure.
  if (!isFiled) {
    if (daysUntil < 0) {
      reasons.push({
        label: `Overdue by ${-daysUntil} day${-daysUntil === 1 ? '' : 's'}`,
        weight: 90 + Math.min(-daysUntil, 30),
        kind: 'overdue',
      })
    } else if (daysUntil <= DUE_SOON_DAYS) {
      reasons.push({
        label: daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
        weight: 62 - daysUntil * 2,
        kind: 'deadline',
      })
    }
  }

  // Reviewer sent it back.
  if (ret.stage === 'changes_requested') {
    reasons.push({ label: 'Reviewer requested changes', weight: 72, kind: 'review' })
  }

  // High-risk open issues, else return-level risk.
  const openHighIssues = issues.filter(
    (i) => i.returnId === ret.id && i.priority === 'high' && (i.status === 'open' || i.status === 'in_progress'),
  )
  if (openHighIssues.length > 0) {
    reasons.push({ label: `High-risk issue: ${openHighIssues[0].title}`, weight: 68, kind: 'risk' })
  } else if (ret.riskLevel === 'high' && !isFiled) {
    reasons.push({ label: 'High-risk return', weight: 36, kind: 'risk' })
  } else if (ret.riskLevel === 'medium' && !isFiled) {
    reasons.push({ label: 'Medium-risk return', weight: 12, kind: 'risk' })
  }

  // A blocking issue prevents completion.
  if (ret.blocker && !isFiled) {
    reasons.push({ label: `Missing item blocks completion: ${ret.blocker}`, weight: 55, kind: 'blocker' })
  }

  // Client responded and the ball is back with the preparer.
  const fulfilledRequests = requests.filter((r) => r.returnId === ret.id && r.status === 'fulfilled')
  if (fulfilledRequests.length > 0 && ret.stage === 'collecting_information') {
    const days = fulfilledRequests[0].fulfilledAt
      ? daysBetween(fulfilledRequests[0].fulfilledAt, today)
      : 0
    reasons.push({
      label: days > 0 ? `Client responded ${days} day${days === 1 ? '' : 's'} ago` : 'Client responded — ready to continue',
      weight: 46,
      kind: 'client',
    })
  }

  // Waiting on the client.
  if (ret.stage === 'waiting_on_client') {
    const waitingDays = daysBetween(ret.updatedAt, today)
    reasons.push({
      label: waitingDays > 0 ? `Waiting on client for ${waitingDays} day${waitingDays === 1 ? '' : 's'}` : 'Waiting on client',
      weight: 20 + Math.min(Math.max(waitingDays, 0), 20),
      kind: 'waiting',
    })
  }

  // Stage readiness.
  if (ret.stage === 'ready_to_prepare') reasons.push({ label: 'Ready to prepare', weight: 30, kind: 'stage' })
  if (ret.stage === 'ready_for_review') reasons.push({ label: 'Ready for review', weight: 28, kind: 'stage' })
  if (ret.stage === 'ready_to_file') reasons.push({ label: 'Ready to file', weight: 25, kind: 'stage' })

  if (reasons.length === 0) {
    reasons.push({
      label: isFiled ? 'Filed — no action needed' : 'On track',
      weight: isFiled ? -100 : 0,
      kind: 'none',
    })
  }

  reasons.sort((a, b) => b.weight - a.weight)
  const score = reasons.reduce((sum, r) => sum + r.weight, 0)

  return {
    score,
    reasons,
    topReason: reasons[0].label,
    topKind: reasons[0].kind,
  }
}

export interface RankedReturn {
  ret: TaxReturn
  priority: PriorityResult
}

/** Rank a set of returns by computed priority (most urgent first). Stable. */
export function rankReturns(returns: TaxReturn[], ctx: PriorityContext = {}): RankedReturn[] {
  return returns
    .map((ret) => ({ ret, priority: computePriority(ret, ctx) }))
    .sort((a, b) => {
      if (b.priority.score !== a.priority.score) return b.priority.score - a.priority.score
      // Tie-break: earlier deadline first, then id for stability.
      const d = daysBetween(ctx.today ?? DEMO_TODAY, a.ret.deadline) - daysBetween(ctx.today ?? DEMO_TODAY, b.ret.deadline)
      if (d !== 0) return d
      return a.ret.id.localeCompare(b.ret.id)
    })
}

export interface DashboardSummary {
  dueSoon: number
  blocked: number
  waitingOnClient: number
  readyForPrep: number
  readyForReview: number
  highRisk: number
}

/** Action-oriented counts for the dashboard summary bar. */
export function computeSummary(returns: TaxReturn[], today: string = DEMO_TODAY): DashboardSummary {
  const summary: DashboardSummary = {
    dueSoon: 0,
    blocked: 0,
    waitingOnClient: 0,
    readyForPrep: 0,
    readyForReview: 0,
    highRisk: 0,
  }

  for (const ret of returns) {
    const isFiled = ret.stage === 'filed'
    const daysUntil = daysBetween(today, ret.deadline)
    if (!isFiled && daysUntil >= 0 && daysUntil <= DUE_SOON_DAYS) summary.dueSoon++
    if (ret.blocker && !isFiled) summary.blocked++
    if (ret.stage === 'waiting_on_client') summary.waitingOnClient++
    if (ret.stage === 'ready_to_prepare') summary.readyForPrep++
    if (ret.stage === 'ready_for_review') summary.readyForReview++
    if (ret.riskLevel === 'high' && !isFiled) summary.highRisk++
  }

  return summary
}
