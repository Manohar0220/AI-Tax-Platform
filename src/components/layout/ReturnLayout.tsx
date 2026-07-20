import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Eye } from 'lucide-react'
import { ReturnContextNav } from '@/components/navigation/ReturnContextNav'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { Badge } from '@/components/feedback/Badge'
import { useDemoStore } from '@/store/demo-store'

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

const STAGE_VARIANTS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  collecting_information: 'default',
  waiting_on_client: 'warning',
  ready_to_prepare: 'primary',
  preparing: 'primary',
  ready_for_review: 'primary',
  under_review: 'primary',
  changes_requested: 'warning',
  waiting_for_client_approval: 'warning',
  ready_to_file: 'success',
  filed: 'success',
  filing_rejected: 'error',
}

export function ReturnLayout() {
  const { returnId } = useParams<{ returnId: string }>()
  const navigate = useNavigate()
  const returns = useDemoStore((s) => s.returns)
  const users = useDemoStore((s) => s.users)
  const clients = useDemoStore((s) => s.clients)

  const taxReturn = returns.find((r) => r.id === returnId)

  if (!taxReturn) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-muted">Return not found.</p>
      </div>
    )
  }

  const client = clients.find((c) => c.id === taxReturn.clientId)
  const preparer = users.find((u) => u.id === taxReturn.preparerId)
  const reviewer = users.find((u) => u.id === taxReturn.reviewerId)
  const clientName = client?.businessName || client?.name || 'Unknown Client'

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumbs
          items={[
            { label: 'Returns', path: '/returns' },
            { label: clientName },
          ]}
        />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/returns')}
              className="mt-1 p-1 rounded-md text-text-muted hover:bg-neutral-100 shrink-0"
              aria-label="Back to returns list"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">
                {clientName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-text-muted">
                <span>{taxReturn.type === 'business' ? 'Business Return' : 'Individual Return'} — {taxReturn.taxYear}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  Due {taxReturn.deadline}
                </span>
                {preparer && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                    {preparer.name}
                  </span>
                )}
                {reviewer && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    {reviewer.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Badge variant={STAGE_VARIANTS[taxReturn.stage] || 'default'}>
            {STAGE_LABELS[taxReturn.stage] || taxReturn.stage}
          </Badge>
        </div>

        {taxReturn.blocker && (
          <div className="mb-3 px-3 py-2 rounded-md bg-warning-50 border border-warning-500 text-sm text-warning-700">
            <span className="font-medium">Blocked:</span> {taxReturn.blocker}
          </div>
        )}
      </div>

      <ReturnContextNav />

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <Outlet />
      </div>
    </div>
  )
}
