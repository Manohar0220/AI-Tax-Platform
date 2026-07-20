import { useNavigate } from 'react-router-dom'
import { CheckSquare, ClipboardList, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react'
import { Drawer } from '@/components/feedback/Drawer'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { useDemoStore } from '@/store/demo-store'
import type { TaxReturn } from '@/domain/types'
import { getReturnClientName } from './dashboard-utils'

const STAGE_LABELS: Record<string, string> = {
  collecting_information: 'Collecting Information',
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

interface ReturnDetailDrawerProps {
  taxReturn: TaxReturn | null
  onClose: () => void
}

export function ReturnDetailDrawer({ taxReturn, onClose }: ReturnDetailDrawerProps) {
  const navigate = useNavigate()
  const clients = useDemoStore((s) => s.clients)
  const tasks = useDemoStore((s) => s.tasks)
  const requests = useDemoStore((s) => s.requests)
  const recommendations = useDemoStore((s) => s.recommendations)
  const users = useDemoStore((s) => s.users)

  if (!taxReturn) return null

  const clientName = getReturnClientName(taxReturn, clients)
  const openTasks = tasks
    .filter((t) => t.returnId === taxReturn.id && (t.status === 'open' || t.status === 'in_progress'))
    .slice(0, 4)
  const openRequests = requests.filter(
    (r) => r.returnId === taxReturn.id && (r.status === 'pending' || r.status === 'overdue'),
  )
  const warnings = recommendations
    .filter((r) => r.returnId === taxReturn.id && (r.type === 'warning' || r.type === 'anomaly') && r.status === 'pending')
    .slice(0, 4)

  const openFull = () => {
    navigate(`/returns/${taxReturn.id}`)
  }

  const primaryAction = () => {
    navigate(`/returns/${taxReturn.id}/review`)
  }

  const userName = (id: string) => users.find((u) => u.id === id)?.name || 'Unassigned'

  return (
    <Drawer open={!!taxReturn} onClose={onClose} title={clientName}>
      <div className="space-y-5">
        {/* Current status */}
        <section>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Current status</p>
            <Badge variant={taxReturn.stage === 'filed' ? 'success' : 'primary'}>
              {STAGE_LABELS[taxReturn.stage] || taxReturn.stage}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-2">{taxReturn.nextAction}</p>
          <p className="text-xs text-text-muted mt-1">
            Next: {userName(
              taxReturn.nextResponsibleRole === 'reviewer'
                ? taxReturn.reviewerId
                : taxReturn.nextResponsibleRole === 'tax_preparer'
                  ? taxReturn.preparerId
                  : '',
            )}
            {' · '}Due {taxReturn.deadline}
          </p>
          {taxReturn.blocker && (
            <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-warning-50 border border-warning-500 text-sm text-warning-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{taxReturn.blocker}</span>
            </div>
          )}
        </section>

        {/* Important tasks */}
        <section>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Important tasks
          </p>
          {openTasks.length === 0 ? (
            <p className="text-sm text-text-muted">No open tasks.</p>
          ) : (
            <ul className="space-y-1.5">
              {openTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text-secondary truncate">{t.title}</span>
                  <Badge variant={t.priority === 'high' ? 'error' : t.priority === 'medium' ? 'warning' : 'default'}>
                    {t.priority}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open client requests */}
        <section>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Open client requests
          </p>
          {openRequests.length === 0 ? (
            <p className="text-sm text-text-muted">No outstanding requests.</p>
          ) : (
            <ul className="space-y-1.5">
              {openRequests.map((r) => (
                <li key={r.id} className="text-sm text-text-secondary">{r.title}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Warnings */}
        {warnings.length > 0 && (
          <section>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning-600" /> Warnings
            </p>
            <ul className="space-y-1.5">
              {warnings.map((w) => (
                <li key={w.id} className="text-sm text-warning-700">{w.title}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border-default">
          <Button onClick={primaryAction}>
            {taxReturn.nextAction}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={openFull}>
            <ExternalLink className="h-4 w-4" />
            Open full return
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
