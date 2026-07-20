import { Check, X, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/feedback'
import { CAPABILITY_MATRIX, CAPABILITY_ROLES } from '@/services/admin-service'

export function PermissionsPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary-600" /> Permissions</h1>
        <p className="text-sm text-text-muted mt-0.5">
          A read-only summary of what each role can do. Administrators manage assignments and monitor
          progress, but cannot edit tax values.
        </p>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[36rem]">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Capability</th>
                {CAPABILITY_ROLES.map((r) => <th key={r.role} className="px-3 py-2 font-medium text-center">{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_MATRIX.map((cap) => (
                <tr key={cap.label} className="border-b border-border-default last:border-0">
                  <td className="px-3 py-2 text-text-secondary">{cap.label}</td>
                  {CAPABILITY_ROLES.map((r) => (
                    <td key={r.role} className="px-3 py-2 text-center">
                      {cap.roles[r.role] ? (
                        <Check className="h-4 w-4 text-success-600 mx-auto" aria-label="Allowed" />
                      ) : (
                        <X className="h-4 w-4 text-neutral-300 mx-auto" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
