import { useMemo, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Clock, ArrowRight, RotateCcw, CheckCircle2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useTasksListStore, PAGE_SIZE } from '@/store/list-stores'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { EmptyState } from '@/components/status'
import { cn } from '@/utils/cn'
import { setTaskStatus } from '@/services/task-service'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'
import type { TaskStatus } from '@/domain/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled',
}

const CLIENT_ROLES = ['individual_taxpayer', 'business_owner']

export function TasksPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const tasks = useDemoStore((s) => s.tasks)
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const { values, page, scrollTop, set, setPage, setScroll, reset } = useTasksListStore()

  // Map returnId -> whether the next action is currently the client's.
  const clientAwaited = useMemo(() => {
    const m = new Map<string, boolean>()
    returns.forEach((r) => m.set(r.id, CLIENT_ROLES.includes(r.nextResponsibleRole)))
    return m
  }, [returns])

  const filtered = useMemo(() => {
    const q = values.search.trim().toLowerCase()
    let list = tasks
    if (values.scope === 'mine') list = list.filter((t) => t.assignedTo === currentUser?.id)
    if (values.status === 'active') list = list.filter((t) => t.status === 'open' || t.status === 'in_progress')
    else if (values.status !== 'all') list = list.filter((t) => t.status === values.status)
    if (values.priority !== 'all') list = list.filter((t) => t.priority === values.priority)
    if (values.action === 'client') list = list.filter((t) => clientAwaited.get(t.returnId))
    else if (values.action === 'staff') list = list.filter((t) => !clientAwaited.get(t.returnId))
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return [...list].sort((a, b) => (rank[a.priority] - rank[b.priority]) || (a.dueDate || '').localeCompare(b.dueDate || ''))
  }, [tasks, values, currentUser, clientAwaited])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const restored = useRef(false)
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    if (main && !restored.current) { main.scrollTop = scrollTop; restored.current = true }
    return () => { const el = document.querySelector('main'); if (el) setScroll(el.scrollTop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clientName = (returnId: string) => {
    const ret = returns.find((r) => r.id === returnId)
    return ret ? getReturnClientName(ret, clients) : returnId
  }
  const activeFilters = (values.status !== 'active' ? 1 : 0) + (values.priority !== 'all' ? 1 : 0) + (values.action !== 'all' ? 1 : 0) + (values.search ? 1 : 0)

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary-600" /> Tasks</h1>
        <p className="text-sm text-text-muted mt-0.5">{filtered.length} task{filtered.length === 1 ? '' : 's'} match your filters.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-md border border-border-default overflow-hidden">
          {(['mine', 'all'] as const).map((s) => (
            <button key={s} onClick={() => set('scope', s)} className={cn('px-3 py-1.5 text-sm', values.scope === s ? 'bg-primary-50 text-primary-700 font-medium' : 'text-text-secondary hover:bg-neutral-50')}>
              {s === 'mine' ? 'Assigned to me' : 'All tasks'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[10rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input value={values.search} onChange={(e) => set('search', e.target.value)} placeholder="Search tasks…" className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border-default bg-surface-card" aria-label="Search tasks" />
        </div>
        <Sel label="Status" value={values.status} onChange={(v) => set('status', v)} options={[['active', 'Active'], ['open', 'Open'], ['in_progress', 'In progress'], ['completed', 'Completed'], ['all', 'All']]} />
        <Sel label="Priority" value={values.priority} onChange={(v) => set('priority', v)} options={[['all', 'Any priority'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
        <Sel label="Waiting on" value={values.action} onChange={(v) => set('action', v)} options={[['all', 'Any owner'], ['client', 'Client action'], ['staff', 'Staff action']]} />
        {activeFilters > 0 && <button onClick={reset} className="text-sm text-text-link hover:underline">Clear ({activeFilters})</button>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No tasks match" description="Adjust your filters to see tasks." icon={<CheckSquare className="h-12 w-12" />} />
      ) : (
        <>
          <div className="space-y-2">
            {pageItems.map((t) => {
              const done = t.status === 'completed' || t.status === 'cancelled'
              return (
                <Card key={t.id} padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('text-sm font-medium', done ? 'text-text-muted line-through' : 'text-text-primary')}>{t.title}</p>
                        <Badge variant={t.priority === 'high' ? 'error' : t.priority === 'medium' ? 'warning' : 'default'}>{t.priority}</Badge>
                        <Badge variant={t.status === 'completed' ? 'success' : t.status === 'in_progress' ? 'primary' : 'default'}>{STATUS_LABELS[t.status]}</Badge>
                        {clientAwaited.get(t.returnId) && <Badge variant="warning">waiting on client</Badge>}
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{t.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                        <span>{clientName(t.returnId)}</span>
                        {t.dueDate && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Due {t.dueDate}</span>}
                      </div>
                      <button onClick={() => navigate(`/returns/${t.returnId}`)} className="text-xs text-text-link hover:underline mt-1.5 inline-flex items-center gap-1">Open return <ArrowRight className="h-3 w-3" /></button>
                    </div>
                    <div className="shrink-0">
                      {done ? (
                        <Button size="sm" variant="ghost" onClick={() => setTaskStatus(t.id, 'open', currentUser!.id)}><RotateCcw className="h-3.5 w-3.5" /> Reopen</Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setTaskStatus(t.id, 'completed', currentUser!.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Complete</Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-text-muted">Page {safePage} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}
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
