import { useMemo, useState, useLayoutEffect, useRef } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { useReturnsListStore, PAGE_SIZE } from '@/store/list-stores'
import { Badge } from '@/components/feedback/Badge'
import { EmptyState } from '@/components/status'
import { cn } from '@/utils/cn'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'
import { ReturnDetailDrawer } from '@/features/dashboard/ReturnDetailDrawer'
import { daysBetween, DEMO_TODAY, DUE_SOON_DAYS } from '@/services/priority-service'
import type { TaxReturn } from '@/domain/types'

const STAGE_LABELS: Record<string, string> = {
  collecting_information: 'Collecting Info', waiting_on_client: 'Waiting on Client',
  ready_to_prepare: 'Ready for preparer review', preparing: 'Preparing', ready_for_review: 'Ready for Review',
  under_review: 'Under Review', changes_requested: 'Changes Requested', waiting_for_client_approval: 'Client Approval',
  ready_to_file: 'Ready to File', filed: 'Filed', filing_rejected: 'Filing Rejected',
}

export function ReturnsListPage() {
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const users = useDemoStore((s) => s.users)
  const { values, page, scrollTop, set, setPage, setScroll, reset } = useReturnsListStore()

  const [selected, setSelected] = useState<TaxReturn | null>(null)

  const preparers = users.filter((u) => u.primaryRole === 'tax_preparer')
  const reviewers = users.filter((u) => u.primaryRole === 'reviewer')

  const filtered = useMemo(() => {
    const q = values.search.trim().toLowerCase()
    const list = returns.filter((r) => {
      if (values.stage !== 'all' && r.stage !== values.stage) return false
      if (values.type !== 'all' && r.type !== values.type) return false
      if (values.risk !== 'all' && r.riskLevel !== values.risk) return false
      if (values.priority !== 'all' && r.priority !== values.priority) return false
      if (values.preparer !== 'all' && r.preparerId !== values.preparer) return false
      if (values.reviewer !== 'all' && r.reviewerId !== values.reviewer) return false
      if (values.blocked === 'blocked' && !r.blocker) return false
      if (values.blocked === 'unblocked' && r.blocker) return false
      if (values.deadline !== 'all') {
        const d = daysBetween(DEMO_TODAY, r.deadline)
        if (values.deadline === 'overdue' && !(d < 0 && r.stage !== 'filed')) return false
        if (values.deadline === 'due_soon' && !(d >= 0 && d <= DUE_SOON_DAYS)) return false
        if (values.deadline === 'later' && !(d > DUE_SOON_DAYS)) return false
      }
      if (q && !getReturnClientName(r, clients).toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false
      return true
    })
    list.sort((a, b) => {
      // Newly onboarded returns always float to the top.
      if (!!a.justOnboarded !== !!b.justOnboarded) return a.justOnboarded ? -1 : 1
      if (values.sort === 'client') return getReturnClientName(a, clients).localeCompare(getReturnClientName(b, clients))
      if (values.sort === 'stage') return a.stage.localeCompare(b.stage)
      return daysBetween(DEMO_TODAY, a.deadline) - daysBetween(DEMO_TODAY, b.deadline) // deadline
    })
    return list
  }, [returns, values, clients])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Restore + persist scroll on the main container.
  const restored = useRef(false)
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    if (main && !restored.current) { main.scrollTop = scrollTop; restored.current = true }
    return () => { const el = document.querySelector('main'); if (el) setScroll(el.scrollTop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeFilters = ['stage', 'type', 'risk', 'deadline', 'preparer', 'reviewer', 'blocked', 'priority']
    .filter((k) => values[k as keyof typeof values] !== 'all').length + (values.search ? 1 : 0)

  const staffName = (id: string) => users.find((u) => u.id === id)?.name || '—'

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Returns</h1>
        <p className="text-sm text-text-muted mt-0.5">{returns.length} total · {filtered.length} match your filters</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input value={values.search} onChange={(e) => set('search', e.target.value)} placeholder="Search client or return ID…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus" aria-label="Search returns" />
        </div>
        <Sel label="Stage" value={values.stage} onChange={(v) => set('stage', v)} options={[['all', 'All stages'], ...Object.entries(STAGE_LABELS)]} />
        <Sel label="Type" value={values.type} onChange={(v) => set('type', v)} options={[['all', 'All types'], ['individual', 'Individual'], ['business', 'Business']]} />
        <Sel label="Risk" value={values.risk} onChange={(v) => set('risk', v)} options={[['all', 'All risk'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
        <Sel label="Priority" value={values.priority} onChange={(v) => set('priority', v)} options={[['all', 'Any priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
        <Sel label="Deadline" value={values.deadline} onChange={(v) => set('deadline', v)} options={[['all', 'Any deadline'], ['overdue', 'Overdue'], ['due_soon', 'Due soon'], ['later', 'Later']]} />
        <Sel label="Blocked" value={values.blocked} onChange={(v) => set('blocked', v)} options={[['all', 'Any'], ['blocked', 'Blocked'], ['unblocked', 'Unblocked']]} />
        <Sel label="Preparer" value={values.preparer} onChange={(v) => set('preparer', v)} options={[['all', 'Any preparer'], ...preparers.map((u) => [u.id, u.name] as [string, string])]} />
        <Sel label="Reviewer" value={values.reviewer} onChange={(v) => set('reviewer', v)} options={[['all', 'Any reviewer'], ...reviewers.map((u) => [u.id, u.name] as [string, string])]} />
        <Sel label="Sort" value={values.sort} onChange={(v) => set('sort', v)} options={[['deadline', 'Sort: Deadline'], ['client', 'Sort: Client'], ['stage', 'Sort: Stage']]} />
        {activeFilters > 0 && (
          <button onClick={reset} className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-text-link hover:underline">
            <X className="h-3.5 w-3.5" /> Clear ({activeFilters})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No returns match" description="Try adjusting your filters or search." icon={<Search className="h-12 w-12" />} />
      ) : (
        <>
          <div className="overflow-x-auto border border-border-default rounded-lg bg-surface-card">
            <table className="w-full text-sm min-w-[48rem]">
              <thead>
                <tr className="border-b border-border-default text-left text-xs text-text-muted">
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Stage</th>
                  <th className="px-3 py-2 font-medium">Preparer</th>
                  <th className="px-3 py-2 font-medium">Deadline</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const overdue = daysBetween(DEMO_TODAY, r.deadline) < 0 && r.stage !== 'filed'
                  return (
                    <tr key={r.id} onClick={() => setSelected(r)} className="border-b border-border-default last:border-0 hover:bg-neutral-50 cursor-pointer">
                      <td className="px-3 py-2">
                        <p className="font-medium text-text-primary flex items-center gap-1.5">
                          {getReturnClientName(r, clients)}
                          {r.justOnboarded && <Badge variant="primary">New</Badge>}
                        </p>
                        <p className="text-xs text-text-muted">{r.id}{r.blocker && <span className="ml-1 text-warning-600" title={r.blocker}>⚠</span>}</p>
                      </td>
                      <td className="px-3 py-2 capitalize text-text-secondary">{r.type}</td>
                      <td className="px-3 py-2"><Badge variant={r.stage === 'filed' ? 'success' : 'default'}>{STAGE_LABELS[r.stage] || r.stage}</Badge></td>
                      <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{staffName(r.preparerId)}</td>
                      <td className={cn('px-3 py-2 whitespace-nowrap', overdue ? 'text-error-600 font-medium' : 'text-text-secondary')}>{r.deadline}</td>
                      <td className="px-3 py-2"><Badge variant={r.riskLevel === 'high' ? 'error' : r.riskLevel === 'medium' ? 'warning' : 'default'}>{r.riskLevel}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-text-muted">Page {safePage} of {totalPages} · {filtered.length} returns</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}

      <ReturnDetailDrawer taxReturn={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="px-2.5 py-2 text-sm rounded-md border border-border-default bg-surface-card">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
