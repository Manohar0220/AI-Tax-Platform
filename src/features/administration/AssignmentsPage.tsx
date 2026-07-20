import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { EmptyState } from '@/components/status'
import { useToastStore } from '@/store/toast-store'
import { reassignPreparer, reassignReviewer, isOverloaded } from '@/services/admin-service'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'

export function AssignmentsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const returns = useDemoStore((s) => s.returns)
  const users = useDemoStore((s) => s.users)
  const clients = useDemoStore((s) => s.clients)
  const addToast = useToastStore((s) => s.addToast)

  const [onlyFlagged, setOnlyFlagged] = useState(true)

  const preparers = users.filter((u) => u.primaryRole === 'tax_preparer')
  const reviewers = users.filter((u) => u.primaryRole === 'reviewer')

  const rows = useMemo(() => {
    let list = returns.filter((r) => r.stage !== 'filed')
    if (onlyFlagged) list = list.filter((r) => !r.preparerId)
    return list.slice(0, 40)
  }, [returns, onlyFlagged])

  const overloadedNote = (userId: string) => {
    const u = users.find((x) => x.id === userId)
    return u && isOverloaded(u, returns) ? ' (overloaded)' : ''
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Assignments</h1>
        <p className="text-sm text-text-muted mt-0.5">Assign or reassign the preparer and reviewer for each return.</p>
      </div>

      <label className="flex items-center gap-2 mb-3 text-sm text-text-secondary">
        <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} className="accent-primary-600" />
        Show only returns needing attention (unassigned preparer)
      </label>

      {rows.length === 0 ? (
        <EmptyState title="Nothing to assign" description="All active returns have appropriate preparers." icon={<AlertTriangle className="h-12 w-12" />} />
      ) : (
        <div className="overflow-x-auto border border-border-default rounded-lg bg-surface-card">
          <table className="w-full text-sm min-w-[44rem]">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">Preparer</th>
                <th className="px-3 py-2 font-medium">Reviewer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const prepOverloaded = users.find((u) => u.id === r.preparerId) && isOverloaded(users.find((u) => u.id === r.preparerId)!, returns)
                const flagged = !r.preparerId
                return (
                  <tr key={r.id} className="border-b border-border-default last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium text-text-primary">{getReturnClientName(r, clients)}</p>
                      <p className="text-xs text-text-muted">{r.id}{flagged && <Badge variant="warning" className="ml-2">needs preparer</Badge>}</p>
                    </td>
                    <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{r.deadline}</td>
                    <td className="px-3 py-2">
                      <select
                        value={r.preparerId}
                        onChange={(e) => { reassignPreparer(r.id, e.target.value, currentUser!.id); addToast({ message: 'Preparer reassigned.', type: 'success' }) }}
                        className="px-2 py-1.5 text-sm rounded-md border border-border-default bg-surface-card max-w-[12rem]"
                      >
                        {preparers.map((p) => <option key={p.id} value={p.id}>{p.name}{overloadedNote(p.id)}</option>)}
                      </select>
                      {prepOverloaded && (
                        <p className="text-xs text-warning-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Preparer is overloaded</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={r.reviewerId}
                        onChange={(e) => { reassignReviewer(r.id, e.target.value, currentUser!.id); addToast({ message: 'Reviewer reassigned.', type: 'success' }) }}
                        className="px-2 py-1.5 text-sm rounded-md border border-border-default bg-surface-card max-w-[12rem]"
                      >
                        {reviewers.map((rv) => <option key={rv.id} value={rv.id}>{rv.name}{overloadedNote(rv.id)}</option>)}
                      </select>
                    </td>
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
