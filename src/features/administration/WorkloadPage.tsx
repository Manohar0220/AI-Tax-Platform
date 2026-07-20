import { useMemo, useState } from 'react'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { EmptyState } from '@/components/status'
import { getStaffWorkload } from '@/services/admin-service'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'
import { daysBetween, DEMO_TODAY, DUE_SOON_DAYS } from '@/services/priority-service'
import type { ReturnStage, RiskLevel } from '@/domain/types'

const STAGE_LABELS: Record<string, string> = {
  collecting_information: 'Collecting Info', waiting_on_client: 'Waiting on Client',
  ready_to_prepare: 'Ready to Prepare', preparing: 'Preparing', ready_for_review: 'Ready for Review',
  under_review: 'Under Review', changes_requested: 'Changes Requested', waiting_for_client_approval: 'Client Approval',
  ready_to_file: 'Ready to File', filed: 'Filed', filing_rejected: 'Filing Rejected',
}

export function WorkloadPage() {
  const returns = useDemoStore((s) => s.returns)
  const users = useDemoStore((s) => s.users)
  const clients = useDemoStore((s) => s.clients)

  const [staffId, setStaffId] = useState('all')
  const [stage, setStage] = useState<ReturnStage | 'all'>('all')
  const [deadline, setDeadline] = useState<'all' | 'overdue' | 'due_soon'>('all')
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all')

  const staff = users.filter((u) => u.firmId && ['tax_preparer', 'reviewer'].includes(u.primaryRole))
  const workload = useMemo(() => getStaffWorkload(users, returns), [users, returns])

  const filtered = useMemo(() => {
    return returns.filter((r) => {
      if (r.stage === 'filed') return false
      if (staffId !== 'all' && r.preparerId !== staffId && r.reviewerId !== staffId) return false
      if (stage !== 'all' && r.stage !== stage) return false
      if (risk !== 'all' && r.riskLevel !== risk) return false
      if (deadline !== 'all') {
        const d = daysBetween(DEMO_TODAY, r.deadline)
        if (deadline === 'overdue' && !(d < 0)) return false
        if (deadline === 'due_soon' && !(d >= 0 && d <= DUE_SOON_DAYS)) return false
      }
      return true
    }).slice(0, 60)
  }, [returns, staffId, stage, deadline, risk])

  const staffName = (id: string) => users.find((u) => u.id === id)?.name || id

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Workload</h1>
        <p className="text-sm text-text-muted mt-0.5">Filter the firm's active work by staff, stage, deadline, and risk.</p>
      </div>

      {/* Per-staff summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {workload.map((w) => (
          <button key={w.user.id} onClick={() => setStaffId(w.user.id === staffId ? 'all' : w.user.id)}
            className={`text-left p-2.5 rounded-lg border ${staffId === w.user.id ? 'border-primary-500 bg-primary-50' : 'border-border-default bg-surface-card'}`}>
            <p className="text-xs text-text-muted truncate">{w.user.name}</p>
            <p className="text-lg font-semibold text-text-primary">{w.load}<span className="text-xs text-text-muted font-normal">/{w.capacity}</span></p>
            <Badge variant={w.status === 'overloaded' ? 'error' : w.status === 'busy' ? 'warning' : 'success'}>{w.status}</Badge>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="px-2.5 py-2 text-sm rounded-md border border-border-default bg-surface-card">
          <option value="all">All staff</option>
          {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value as never)} className="px-2.5 py-2 text-sm rounded-md border border-border-default bg-surface-card">
          <option value="all">All stages</option>
          {Object.keys(STAGE_LABELS).map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select value={deadline} onChange={(e) => setDeadline(e.target.value as never)} className="px-2.5 py-2 text-sm rounded-md border border-border-default bg-surface-card">
          <option value="all">Any deadline</option>
          <option value="overdue">Overdue</option>
          <option value="due_soon">Due soon</option>
        </select>
        <select value={risk} onChange={(e) => setRisk(e.target.value as never)} className="px-2.5 py-2 text-sm rounded-md border border-border-default bg-surface-card">
          <option value="all">All risk</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <p className="text-xs text-text-muted mb-2">{filtered.length} return{filtered.length === 1 ? '' : 's'}</p>

      {filtered.length === 0 ? (
        <EmptyState title="No matching work" description="Adjust the filters to see returns." />
      ) : (
        <div className="overflow-x-auto border border-border-default rounded-lg bg-surface-card">
          <table className="w-full text-sm min-w-[44rem]">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Preparer</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border-default last:border-0">
                  <td className="px-3 py-2 font-medium text-text-primary">{getReturnClientName(r, clients)}</td>
                  <td className="px-3 py-2"><Badge variant="default">{STAGE_LABELS[r.stage] || r.stage}</Badge></td>
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{staffName(r.preparerId)}</td>
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{r.deadline}</td>
                  <td className="px-3 py-2"><Badge variant={r.riskLevel === 'high' ? 'error' : r.riskLevel === 'medium' ? 'warning' : 'default'}>{r.riskLevel}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
