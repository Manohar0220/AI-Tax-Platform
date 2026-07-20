import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Layers, CalendarClock, Ban, UserX, Users, ArrowRight } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { getFirmOverview } from '@/services/admin-service'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'
import { daysBetween, DEMO_TODAY } from '@/services/priority-service'

const STAGE_LABELS: Record<string, string> = {
  collecting_information: 'Collecting Info', waiting_on_client: 'Waiting on Client',
  ready_to_prepare: 'Ready to Prepare', preparing: 'Preparing', ready_for_review: 'Ready for Review',
  under_review: 'Under Review', changes_requested: 'Changes Requested', waiting_for_client_approval: 'Client Approval',
  ready_to_file: 'Ready to File', filed: 'Filed', filing_rejected: 'Filing Rejected',
}

export function FirmOverviewPage() {
  const returns = useDemoStore((s) => s.returns)
  const users = useDemoStore((s) => s.users)
  const clients = useDemoStore((s) => s.clients)

  const overview = useMemo(() => getFirmOverview(returns, users), [returns, users])
  const maxStage = Math.max(...overview.returnsByStage.map((s) => s.count), 1)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Firm overview</h1>
        <p className="text-sm text-text-muted mt-0.5">Where the firm's work stands across all returns.</p>
      </div>

      {/* Headline counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Layers} label="Active returns" value={overview.totalActive} />
        <Stat icon={Ban} label="Blocked" value={overview.blocked.length} tone="warning" />
        <Stat icon={UserX} label="Assignment flags" value={overview.flaggedAssignments.length} tone="warning" />
        <Stat icon={CalendarClock} label="Due within 14 days" value={overview.urgentDeadlines.length} tone="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Returns by stage */}
        <Card padding="md">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-1.5 mb-3"><Layers className="h-4 w-4 text-text-muted" /> Returns by stage</h2>
          <div className="space-y-1.5">
            {overview.returnsByStage.map((s) => (
              <div key={s.stage} className="flex items-center gap-2">
                <span className="text-xs text-text-secondary w-32 shrink-0">{STAGE_LABELS[s.stage] || s.stage}</span>
                <div className="flex-1 h-4 bg-neutral-100 rounded overflow-hidden">
                  <div className="h-full bg-primary-400 rounded" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-text-primary w-8 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Staff capacity */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-1.5"><Users className="h-4 w-4 text-text-muted" /> Staff capacity</h2>
            <Link to="/admin/workload" className="text-xs text-text-link hover:underline">Workload</Link>
          </div>
          <div className="space-y-2">
            {overview.workload.map((w) => (
              <div key={w.user.id} className="flex items-center gap-2">
                <span className="text-sm text-text-secondary w-28 shrink-0 truncate">{w.user.name}</span>
                <div className="flex-1 h-3 bg-neutral-100 rounded overflow-hidden">
                  <div className={`h-full rounded ${w.status === 'overloaded' ? 'bg-error-500' : w.status === 'busy' ? 'bg-warning-500' : 'bg-success-500'}`}
                    style={{ width: `${Math.min(100, (w.load / w.capacity) * 100)}%` }} />
                </div>
                <span className="text-xs text-text-muted w-14 text-right">{w.load}/{w.capacity}</span>
                <Badge variant={w.status === 'overloaded' ? 'error' : w.status === 'busy' ? 'warning' : 'success'}>{w.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Urgent deadlines */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-error-600" /> Urgent deadlines</h2>
            <Link to="/admin/deadlines" className="text-xs text-text-link hover:underline">All</Link>
          </div>
          {overview.urgentDeadlines.length === 0 ? <p className="text-sm text-text-muted">Nothing due soon.</p> : (
            <ul className="space-y-1.5">
              {overview.urgentDeadlines.slice(0, 6).map((r) => {
                const d = daysBetween(DEMO_TODAY, r.deadline)
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/returns/${r.id}`} className="text-text-secondary hover:text-text-link truncate">{getReturnClientName(r, clients)}</Link>
                    <span className={d < 0 ? 'text-error-600 font-medium' : 'text-text-muted'}>{d < 0 ? `${-d}d overdue` : `${d}d`}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Flagged assignments */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-1.5"><UserX className="h-4 w-4 text-warning-600" /> Needs assignment</h2>
            <Link to="/admin/assignments" className="text-xs text-text-link hover:underline inline-flex items-center gap-1">Assign <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {overview.flaggedAssignments.length === 0 ? <p className="text-sm text-text-muted">All returns are properly assigned.</p> : (
            <ul className="space-y-1.5">
              {overview.flaggedAssignments.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/returns/${r.id}`} className="text-text-secondary hover:text-text-link truncate">{getReturnClientName(r, clients)}</Link>
                  <Badge variant="warning">needs preparer</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Layers; label: string; value: number; tone?: 'warning' | 'error' }) {
  return (
    <Card padding="md">
      <p className="text-xs text-text-muted flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${tone === 'error' ? 'text-error-600' : tone === 'warning' ? 'text-warning-600' : 'text-text-primary'}`}>{value}</p>
    </Card>
  )
}
