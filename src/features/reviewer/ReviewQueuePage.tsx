import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { EmptyState } from '@/components/status'
import { cn } from '@/utils/cn'
import { buildReviewQueue } from '@/services/reviewer-service'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'
import { daysBetween, DEMO_TODAY } from '@/services/priority-service'

const STATUS_LABELS: Record<string, string> = {
  collecting_information: 'Collecting Info',
  waiting_on_client: 'Waiting on Client',
  ready_to_prepare: 'Ready to Prepare',
  preparing: 'Preparing',
  ready_for_review: 'Ready for Review',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  waiting_for_client_approval: 'Client Approval',
  ready_to_file: 'Ready to File',
  filed: 'Filed',
  filing_rejected: 'Filing Rejected',
}

const REASON_VARIANT: Record<string, 'default' | 'primary' | 'warning' | 'error' | 'success'> = {
  rejected: 'error', escalated: 'error', risk: 'warning', correction: 'primary',
  deadline: 'warning', warning: 'warning', approval: 'primary', stage: 'default',
}

export function ReviewQueuePage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const returns = useDemoStore((s) => s.returns)
  const fields = useDemoStore((s) => s.fields)
  const issues = useDemoStore((s) => s.issues)
  const recommendations = useDemoStore((s) => s.recommendations)
  const clients = useDemoStore((s) => s.clients)
  const users = useDemoStore((s) => s.users)

  const rows = useMemo(
    () => buildReviewQueue({ returns, fields, issues, recommendations }, currentUser?.id || ''),
    [returns, fields, issues, recommendations, currentUser],
  )

  const preparerName = (id: string) => users.find((u) => u.id === id)?.name || '—'

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-600" /> Review queue
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Returns needing your review, ranked by risk, corrections, and deadline.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing to review" description="Returns ready for your review will appear here." icon={<ShieldCheck className="h-12 w-12" />} />
      ) : (
        <div className="overflow-x-auto border border-border-default rounded-lg bg-surface-card">
          <table className="w-full text-sm min-w-[56rem]">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Preparer</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Corr.</th>
                <th className="px-3 py-2 font-medium">Warn.</th>
                <th className="px-3 py-2 font-medium">Needs attention</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ ret, reason, reasonKind, correctionCount, warningCount }) => {
                const overdue = daysBetween(DEMO_TODAY, ret.deadline) < 0 && ret.stage !== 'filed'
                return (
                  <tr
                    key={ret.id}
                    onClick={() => navigate(`/returns/${ret.id}`)}
                    className="border-b border-border-default last:border-0 hover:bg-neutral-50 cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium text-text-primary flex items-center gap-1.5">
                        {getReturnClientName(ret, clients)}
                        {ret.justSubmittedForReview && <Badge variant="primary">New</Badge>}
                      </p>
                      <p className="text-xs text-text-muted">{ret.id}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-text-secondary">{ret.type}</td>
                    <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{preparerName(ret.preparerId)}</td>
                    <td className={cn('px-3 py-2 whitespace-nowrap', overdue ? 'text-error-600 font-medium' : 'text-text-secondary')}>{ret.deadline}</td>
                    <td className="px-3 py-2"><Badge variant="default">{STATUS_LABELS[ret.stage] || ret.stage}</Badge></td>
                    <td className="px-3 py-2"><Badge variant={ret.riskLevel === 'high' ? 'error' : ret.riskLevel === 'medium' ? 'warning' : 'default'}>{ret.riskLevel}</Badge></td>
                    <td className="px-3 py-2 text-center text-text-secondary">{correctionCount || '—'}</td>
                    <td className="px-3 py-2 text-center text-text-secondary">{warningCount || '—'}</td>
                    <td className="px-3 py-2"><Badge variant={REASON_VARIANT[reasonKind]}>{reason}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
