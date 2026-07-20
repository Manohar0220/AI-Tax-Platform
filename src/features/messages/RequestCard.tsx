import { useState } from 'react'
import { ClipboardList, Clock, UserCheck, CheckCircle2, RotateCcw, UserPlus, MessageSquarePlus } from 'lucide-react'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { Modal } from '@/components/feedback/Modal'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import { cn } from '@/utils/cn'
import type { ClientRequest, Role } from '@/domain/types'
import {
  isStaffRole,
  getRequestNextActionOwner,
  resolveRequest,
  reopenRequest,
  assignTaskFromRequest,
} from '@/services/collaboration-service'

interface RequestCardProps {
  request: ClientRequest
  viewerRole: Role
  viewerUserId: string
  onAsk: (request: ClientRequest) => void
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Awaiting response', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'error' },
  fulfilled: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

export function RequestCard({ request, viewerRole, viewerUserId, onAsk }: RequestCardProps) {
  const users = useDemoStore((s) => s.users)
  const addToast = useToastStore((s) => s.addToast)
  const staff = isStaffRole(viewerRole)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignee, setAssignee] = useState('user-maya')

  const requester = users.find((u) => u.id === request.requestedBy)
  const owner = getRequestNextActionOwner(request)
  const statusMeta = STATUS_META[request.status] || STATUS_META.pending
  const isOpen = request.status === 'pending' || request.status === 'overdue'

  const staffUsers = users.filter((u) =>
    ['tax_preparer', 'reviewer'].includes(u.primaryRole),
  )

  const handleComplete = () => {
    resolveRequest(request.id, viewerUserId)
    addToast({ message: 'Request marked as complete.', type: 'success' })
  }

  const handleReopen = () => {
    reopenRequest(request.id, viewerUserId)
    addToast({ message: 'Request reopened.', type: 'info' })
  }

  const handleAssign = () => {
    const task = assignTaskFromRequest(request.id, assignee, viewerUserId)
    setAssignOpen(false)
    if (task) {
      const name = users.find((u) => u.id === assignee)?.name || 'staff member'
      addToast({ message: `Task assigned to ${name}.`, type: 'success' })
    }
  }

  return (
    <Card padding="md" className={cn('border-l-4', isOpen ? 'border-l-warning-500' : 'border-l-success-500')}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-neutral-100 text-neutral-600 shrink-0">
          <ClipboardList className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-text-primary">{request.title}</h3>
            <Badge variant={statusMeta.variant} className="shrink-0">{statusMeta.label}</Badge>
          </div>

          {/* Why it is needed */}
          <p className="text-sm text-text-secondary mt-1">{request.description}</p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
            <span>Requested by {requester?.name || 'your preparer'}</span>
            {request.dueDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Due {new Date(request.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5" />
              Next: {owner === 'client' ? 'Client' : 'Firm'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {staff ? (
              <>
                {isOpen ? (
                  <Button size="sm" variant="secondary" onClick={handleComplete}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={handleReopen}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reopen
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setAssignOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign task
                </Button>
              </>
            ) : (
              isOpen && (
                <>
                  <Button size="sm" onClick={handleComplete}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark as done
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onAsk(request)}>
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Ask a question
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Assign task modal (staff) */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign a task" size="sm">
        <p className="text-sm text-text-secondary mb-3">
          Create a follow-up task for this request and assign it to a team member.
        </p>
        <label htmlFor="assignee" className="block text-sm font-medium text-text-secondary mb-1">
          Assign to
        </label>
        <select
          id="assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-md border border-border-default bg-surface-card mb-4"
        >
          {staffUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleAssign}>Create task</Button>
        </div>
      </Modal>
    </Card>
  )
}
