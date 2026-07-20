import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { EmptyState } from '@/components/status'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'
import { daysBetween, DEMO_TODAY } from '@/services/priority-service'

export function DeadlinesPage() {
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const users = useDemoStore((s) => s.users)

  const upcoming = useMemo(
    () => returns
      .filter((r) => r.stage !== 'filed')
      .map((r) => ({ r, d: daysBetween(DEMO_TODAY, r.deadline) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 40),
    [returns],
  )

  const staffName = (id: string) => users.find((u) => u.id === id)?.name || '—'

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary-600" /> Deadlines</h1>
        <p className="text-sm text-text-muted mt-0.5">Filing calendar across the firm, soonest first.</p>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState title="No upcoming deadlines" description="All returns are filed." icon={<CalendarClock className="h-12 w-12" />} />
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-border-default">
            {upcoming.map(({ r, d }) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <Link to={`/returns/${r.id}`} className="text-sm font-medium text-text-primary hover:text-text-link truncate">{getReturnClientName(r, clients)}</Link>
                  <p className="text-xs text-text-muted">{r.deadline} · {staffName(r.preparerId)}</p>
                </div>
                <Badge variant={d < 0 ? 'error' : d <= 14 ? 'warning' : 'default'}>
                  {d < 0 ? `${-d}d overdue` : d === 0 ? 'Due today' : `${d}d left`}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
