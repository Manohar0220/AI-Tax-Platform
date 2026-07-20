import { useState } from 'react'
import { TrendingUp, TrendingDown, Scale, Receipt, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { useToastStore } from '@/store/toast-store'
import { getBusinessSummary, clientApproveReturn } from '@/services/business-service'

function money(n: number): string {
  const sign = n < 0 ? '−' : ''
  return `${sign}$${Math.abs(n).toLocaleString('en-US')}`
}

interface BusinessReturnSummaryProps {
  returnId: string
  stage: string
  viewerUserId: string
}

export function BusinessReturnSummary({ returnId, stage, viewerUserId }: BusinessReturnSummaryProps) {
  const summary = getBusinessSummary(returnId)
  const addToast = useToastStore((s) => s.addToast)
  const [details, setDetails] = useState(false)

  if (!summary) return null

  const readyForApproval = stage === 'waiting_for_client_approval'
  const approved = stage === 'ready_to_file' || stage === 'filed'

  const handleApprove = () => {
    clientApproveReturn(returnId, viewerUserId)
    addToast({ message: 'Thank you — your return has been approved for filing.', type: 'success' })
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-base font-medium text-text-primary">Your business return summary</h2>
        {readyForApproval ? <Badge variant="primary">Ready for your approval</Badge>
          : approved ? <Badge variant="success">Approved</Badge>
          : <Badge variant="default">Draft estimate</Badge>}
      </div>
      <p className="text-sm text-text-muted mb-4">
        {readyForApproval
          ? 'Please review the summary below and approve your return for filing.'
          : approved
            ? 'You approved this return. Your preparer will file it.'
            : 'These figures are a working estimate while your accountant finalizes the return.'}
      </p>

      {/* Headline figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Figure icon={TrendingUp} label="Business income" value={money(summary.income)} />
        <Figure icon={TrendingDown} label="Business expenses" value={money(summary.expenses)} />
        <Figure icon={Scale} label="Taxable profit" value={money(summary.taxableProfit)} />
        <Figure icon={Receipt} label="Estimated amount due" value={money(summary.estimatedDue)} highlight />
      </div>

      {/* Progressive disclosure */}
      <button
        onClick={() => setDetails((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-sm text-text-link hover:underline"
        aria-expanded={details}
      >
        {details ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {details ? 'Hide details' : 'See details'}
      </button>
      {details && (
        <div className="mt-2 border-t border-border-default pt-2 space-y-1">
          {summary.breakdown.map((b, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{b.label}</span>
              <span className={b.value < 0 ? 'text-text-secondary' : 'font-medium text-text-primary'}>{money(b.value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm border-t border-border-default pt-1 mt-1">
            <span className="text-text-muted">Taxable profit</span>
            <span className="font-semibold text-text-primary">{money(summary.taxableProfit)}</span>
          </div>
        </div>
      )}

      {/* Acknowledgements */}
      {summary.acknowledgements.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Please note before approving</p>
          <ul className="space-y-1.5">
            {summary.acknowledgements.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <AlertCircle className="h-4 w-4 text-warning-600 shrink-0 mt-0.5" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {readyForApproval && (
        <div className="mt-4 pt-3 border-t border-border-default">
          <Button onClick={handleApprove}>
            <CheckCircle2 className="h-4 w-4" /> Approve return for filing
          </Button>
        </div>
      )}
    </Card>
  )
}

function Figure({ icon: Icon, label, value, highlight }: { icon: typeof TrendingUp; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-primary-200 bg-primary-50/40' : 'border-border-default'}`}>
      <p className="text-xs text-text-muted flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="text-lg font-semibold text-text-primary mt-1">{value}</p>
    </div>
  )
}
