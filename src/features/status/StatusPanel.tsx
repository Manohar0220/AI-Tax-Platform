import { CheckCircle2, Circle, AlertTriangle, Clock, UserCheck } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { getStatusDescriptor, type StatusAudience } from '@/services/status-service'
import type { TaxReturn } from '@/domain/types'

interface StatusPanelProps {
  taxReturn: TaxReturn
  audience: StatusAudience
}

/**
 * One status, rendered for a specific audience. Always shows the current stage,
 * a plain-language explanation, completed steps, the next action, the next
 * responsible person, any blocker, and the deadline when relevant.
 */
export function StatusPanel({ taxReturn, audience }: StatusPanelProps) {
  const users = useDemoStore((s) => s.users)
  const clients = useDemoStore((s) => s.clients)
  const d = getStatusDescriptor(taxReturn, audience, users, clients)

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-text-muted">
            {audience === 'staff' ? `Stage ${d.index} of ${d.totalStages}` : 'Where things stand'}
          </p>
          <h3 className="text-base font-semibold text-text-primary">{d.label}</h3>
        </div>
        <Badge variant={taxReturn.stage === 'filed' ? 'success' : taxReturn.stage === 'filing_rejected' ? 'error' : 'primary'}>
          {d.label}
        </Badge>
      </div>

      <p className="text-sm text-text-secondary mt-2">{d.explanation}</p>

      {/* Next action + responsible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-border-default">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-text-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-text-muted">Next action</p>
            <p className="text-sm text-text-primary">{d.nextActionText}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <UserCheck className="h-4 w-4 text-text-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-text-muted">Responsible</p>
            <p className="text-sm text-text-primary">{d.nextResponsiblePerson}</p>
          </div>
        </div>
      </div>

      {/* Blocker — always shown when present */}
      {d.blocker && (
        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-warning-50 border border-warning-500 text-sm text-warning-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span><span className="font-medium">{audience === 'staff' ? 'Blocked:' : "What's needed:"}</span> {d.blocker}</span>
        </div>
      )}

      {/* Deadline when relevant */}
      {d.showDeadline && (
        <p className="text-xs text-text-muted mt-2">
          {audience === 'staff' ? 'Deadline' : 'Filing deadline'}: {new Date(d.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {/* Completed steps */}
      {d.completedStepLabels.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Completed</p>
          <ul className="space-y-1">
            {d.completedStepLabels.map((label, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" /> {label}
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm text-text-primary font-medium">
              <Circle className="h-4 w-4 text-primary-500 shrink-0" /> {d.label} (current)
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
