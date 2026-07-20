import { useMemo, useState, useLayoutEffect, useRef } from 'react'
import { Search, CalendarClock, Ban, Clock, FileEdit, Eye, AlertTriangle, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useDashboardStore } from '@/store/dashboard-store'
import { Badge } from '@/components/feedback/Badge'
import { EmptyState } from '@/components/status'
import { cn } from '@/utils/cn'
import type { TaxReturn } from '@/domain/types'
import {
  rankReturns,
  computeSummary,
  daysBetween,
  DEMO_TODAY,
  DUE_SOON_DAYS,
  type PriorityReason,
} from '@/services/priority-service'
import { getReturnClientName, getNextResponsiblePerson } from './dashboard-utils'
import { ReturnDetailDrawer } from './ReturnDetailDrawer'

const STAGE_LABELS: Record<string, string> = {
  collecting_information: 'Collecting Info',
  waiting_on_client: 'Waiting on Client',
  ready_to_prepare: 'Ready for preparer review',
  preparing: 'Preparing',
  ready_for_review: 'Ready for Review',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  waiting_for_client_approval: 'Client Approval',
  ready_to_file: 'Ready to File',
  filed: 'Filed',
  filing_rejected: 'Filing Rejected',
}

const STAGE_OPTIONS = Object.keys(STAGE_LABELS)

const REASON_VARIANT: Record<PriorityReason['kind'], 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  rejection: 'error',
  overdue: 'error',
  review: 'warning',
  risk: 'warning',
  client: 'primary',
  blocker: 'warning',
  deadline: 'warning',
  waiting: 'default',
  stage: 'primary',
  none: 'default',
}

export function PreparerDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const activeRole = useAuthStore((s) => s.activeRole)
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const users = useDemoStore((s) => s.users)
  const issues = useDemoStore((s) => s.issues)
  const requests = useDemoStore((s) => s.requests)

  const {
    scope, stage, risk, deadline, blocked, type, reviewerId, search, sort, scrollTop,
    setFilter, resetFilters, setScrollTop,
  } = useDashboardStore()

  const [selected, setSelected] = useState<TaxReturn | null>(null)

  const isReviewer = activeRole === 'reviewer'

  // Scope: "my returns" means owned by the current staff member.
  const scopedReturns = useMemo(() => {
    if (scope === 'all') return returns
    return returns.filter((r) =>
      isReviewer ? r.reviewerId === currentUser?.id : r.preparerId === currentUser?.id,
    )
  }, [returns, scope, isReviewer, currentUser])

  const summary = useMemo(() => computeSummary(scopedReturns, DEMO_TODAY), [scopedReturns])

  const reviewerOptions = useMemo(() => {
    const ids = [...new Set(returns.map((r) => r.reviewerId))]
    return ids.map((id) => ({ id, name: users.find((u) => u.id === id)?.name || id }))
  }, [returns, users])

  // Apply filters.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scopedReturns.filter((r) => {
      if (stage !== 'all' && r.stage !== stage) return false
      if (risk !== 'all' && r.riskLevel !== risk) return false
      if (type !== 'all' && r.type !== type) return false
      if (reviewerId !== 'all' && r.reviewerId !== reviewerId) return false
      if (blocked === 'blocked' && !r.blocker) return false
      if (blocked === 'unblocked' && r.blocker) return false
      if (deadline !== 'all') {
        const d = daysBetween(DEMO_TODAY, r.deadline)
        const filed = r.stage === 'filed'
        if (deadline === 'overdue' && !(d < 0 && !filed)) return false
        if (deadline === 'due_soon' && !(d >= 0 && d <= DUE_SOON_DAYS && !filed)) return false
        if (deadline === 'later' && !(d > DUE_SOON_DAYS)) return false
      }
      if (q) {
        const name = getReturnClientName(r, clients).toLowerCase()
        if (!name.includes(q) && !r.id.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [scopedReturns, stage, risk, type, reviewerId, blocked, deadline, search, clients])

  // Rank (priority) then optionally re-sort by other keys.
  const ranked = useMemo(() => {
    const r = rankReturns(filtered, { today: DEMO_TODAY, issues, requests })
    let ordered = r
    if (sort === 'deadline') {
      ordered = [...r].sort((a, b) => daysBetween(DEMO_TODAY, a.ret.deadline) - daysBetween(DEMO_TODAY, b.ret.deadline))
    } else if (sort === 'client') {
      ordered = [...r].sort((a, b) =>
        getReturnClientName(a.ret, clients).localeCompare(getReturnClientName(b.ret, clients)),
      )
    }
    // Newly onboarded returns always float to the top of the queue.
    return [...ordered].sort((a, b) => (a.ret.justOnboarded ? 0 : 1) - (b.ret.justOnboarded ? 0 : 1))
  }, [filtered, issues, requests, sort, clients])

  // Restore + persist scroll position on the main scroll container.
  const restoredRef = useRef(false)
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    if (main && !restoredRef.current) {
      main.scrollTop = scrollTop
      restoredRef.current = true
    }
    return () => {
      const el = document.querySelector('main')
      if (el) setScrollTop(el.scrollTop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeFilterCount =
    (stage !== 'all' ? 1 : 0) + (risk !== 'all' ? 1 : 0) + (deadline !== 'all' ? 1 : 0) +
    (blocked !== 'all' ? 1 : 0) + (type !== 'all' ? 1 : 0) + (reviewerId !== 'all' ? 1 : 0) +
    (search ? 1 : 0)

  const summaryCards = [
    { key: 'dueSoon', label: 'Due soon', value: summary.dueSoon, icon: CalendarClock, onClick: () => setFilter('deadline', 'due_soon') },
    { key: 'blocked', label: 'Blocked', value: summary.blocked, icon: Ban, onClick: () => setFilter('blocked', 'blocked') },
    { key: 'waiting', label: 'Waiting on client', value: summary.waitingOnClient, icon: Clock, onClick: () => setFilter('stage', 'waiting_on_client') },
    { key: 'prep', label: 'Ready for prep', value: summary.readyForPrep, icon: FileEdit, onClick: () => setFilter('stage', 'ready_to_prepare') },
    { key: 'review', label: 'Ready for review', value: summary.readyForReview, icon: Eye, onClick: () => setFilter('stage', 'ready_for_review') },
    { key: 'risk', label: 'High-risk', value: summary.highRisk, icon: AlertTriangle, onClick: () => setFilter('risk', 'high') },
  ]

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">
          {scope === 'mine' ? 'Your work queue' : 'All returns'}
        </h1>
        <p className="text-sm text-text-muted mt-0.5">What needs your attention right now, ranked by priority.</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
        {summaryCards.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.key}
              onClick={c.onClick}
              className="text-left p-3 rounded-lg border border-border-default bg-surface-card hover:border-border-strong transition-colors"
            >
              <div className="flex items-center gap-2 text-text-muted">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{c.label}</span>
              </div>
              <p className="text-2xl font-semibold text-text-primary mt-1">{c.value}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="inline-flex rounded-md border border-border-default overflow-hidden">
          {(['mine', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter('scope', s)}
              className={cn(
                'px-3 py-1.5 text-sm',
                scope === s ? 'bg-primary-50 text-primary-700 font-medium' : 'text-text-secondary hover:bg-neutral-50',
              )}
            >
              {s === 'mine' ? 'My returns' : 'All permitted'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search client or return ID…"
            value={search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus"
            aria-label="Search by client or return ID"
          />
        </div>

        <FilterSelect label="Stage" value={stage} onChange={(v) => setFilter('stage', v as never)}
          options={[{ value: 'all', label: 'All stages' }, ...STAGE_OPTIONS.map((s) => ({ value: s, label: STAGE_LABELS[s] }))]} />
        <FilterSelect label="Risk" value={risk} onChange={(v) => setFilter('risk', v as never)}
          options={[{ value: 'all', label: 'All risk' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
        <FilterSelect label="Deadline" value={deadline} onChange={(v) => setFilter('deadline', v as never)}
          options={[{ value: 'all', label: 'Any deadline' }, { value: 'overdue', label: 'Overdue' }, { value: 'due_soon', label: 'Due soon' }, { value: 'later', label: 'Later' }]} />
        <FilterSelect label="Blocked" value={blocked} onChange={(v) => setFilter('blocked', v as never)}
          options={[{ value: 'all', label: 'Any' }, { value: 'blocked', label: 'Blocked' }, { value: 'unblocked', label: 'Unblocked' }]} />
        <FilterSelect label="Type" value={type} onChange={(v) => setFilter('type', v as never)}
          options={[{ value: 'all', label: 'All types' }, { value: 'individual', label: 'Individual' }, { value: 'business', label: 'Business' }]} />
        <FilterSelect label="Reviewer" value={reviewerId} onChange={(v) => setFilter('reviewerId', v as never)}
          options={[{ value: 'all', label: 'Any reviewer' }, ...reviewerOptions.map((r) => ({ value: r.id, label: r.name }))]} />
        <FilterSelect label="Sort" value={sort} onChange={(v) => setFilter('sort', v as never)}
          options={[{ value: 'priority', label: 'Sort: Priority' }, { value: 'deadline', label: 'Sort: Deadline' }, { value: 'client', label: 'Sort: Client' }]} />

        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-text-link hover:underline">
            <X className="h-3.5 w-3.5" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      <p className="text-xs text-text-muted mb-2">{ranked.length} return{ranked.length === 1 ? '' : 's'}</p>

      {/* Queue */}
      {ranked.length === 0 ? (
        <EmptyState title="Nothing matches" description="Try adjusting your filters or search." icon={<Search className="h-12 w-12" />} />
      ) : (
        <div className="overflow-x-auto border border-border-default rounded-lg bg-surface-card">
          <table className="w-full text-sm min-w-[52rem]">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">Next action</th>
                <th className="px-3 py-2 font-medium">Responsible</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Why prioritized</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ ret, priority }) => {
                const d = daysBetween(DEMO_TODAY, ret.deadline)
                const overdue = d < 0 && ret.stage !== 'filed'
                return (
                  <tr
                    key={ret.id}
                    onClick={() => setSelected(ret)}
                    className="border-b border-border-default last:border-0 hover:bg-neutral-50 cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium text-text-primary flex items-center gap-1.5">
                        {getReturnClientName(ret, clients)}
                        {ret.justOnboarded && <Badge variant="primary">New</Badge>}
                      </p>
                      <p className="text-xs text-text-muted">{ret.id}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-text-secondary">{ret.type}</td>
                    <td className="px-3 py-2">
                      <Badge variant={ret.stage === 'filed' ? 'success' : 'default'}>{STAGE_LABELS[ret.stage] || ret.stage}</Badge>
                    </td>
                    <td className={cn('px-3 py-2 whitespace-nowrap', overdue ? 'text-error-600 font-medium' : 'text-text-secondary')}>
                      {ret.deadline}
                      {ret.blocker && <span className="ml-1 text-warning-600" title={ret.blocker}>⚠</span>}
                    </td>
                    <td className="px-3 py-2 text-text-secondary max-w-[14rem] truncate">{ret.nextAction}</td>
                    <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{getNextResponsiblePerson(ret, users, clients)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={ret.riskLevel === 'high' ? 'error' : ret.riskLevel === 'medium' ? 'warning' : 'default'}>
                        {ret.riskLevel}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={REASON_VARIANT[priority.topKind]}>{priority.topReason}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ReturnDetailDrawer taxReturn={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2.5 py-2 text-sm rounded-md border border-border-default bg-surface-card"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
