import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { getStaffWorkload } from '@/services/admin-service'

const ROLE_LABELS: Record<string, string> = {
  tax_preparer: 'Tax Preparer', reviewer: 'Reviewer', firm_administrator: 'Administrator',
}

export function TeamPage() {
  const users = useDemoStore((s) => s.users)
  const returns = useDemoStore((s) => s.returns)
  const workload = useMemo(() => getStaffWorkload(users, returns), [users, returns])

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2"><Users className="h-5 w-5 text-primary-600" /> Team</h1>
        <p className="text-sm text-text-muted mt-0.5">Staff roles, workload, capacity, and availability.</p>
      </div>

      <div className="overflow-x-auto border border-border-default rounded-lg bg-surface-card">
        <table className="w-full text-sm min-w-[40rem]">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-text-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Workload</th>
              <th className="px-3 py-2 font-medium">Capacity</th>
              <th className="px-3 py-2 font-medium">Availability</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {workload.map((w) => (
              <tr key={w.user.id} className="border-b border-border-default last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">{w.user.avatarInitials}</span>
                    <span className="font-medium text-text-primary">{w.user.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-text-secondary">{ROLE_LABELS[w.user.primaryRole] || w.user.primaryRole}</td>
                <td className="px-3 py-2 text-text-secondary">{w.load} active</td>
                <td className="px-3 py-2 text-text-secondary">{w.capacity}</td>
                <td className={`px-3 py-2 ${w.availability < 0 ? 'text-error-600 font-medium' : 'text-text-secondary'}`}>
                  {w.availability < 0 ? `${-w.availability} over` : `${w.availability} free`}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={w.status === 'overloaded' ? 'error' : w.status === 'busy' ? 'warning' : 'success'}>{w.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
