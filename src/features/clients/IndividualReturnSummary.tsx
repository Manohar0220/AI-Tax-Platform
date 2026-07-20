import { CheckCircle2, Download, PartyPopper } from 'lucide-react'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { useToastStore } from '@/store/toast-store'
import { getIndividualSummary, clientApproveReturn } from '@/services/business-service'

function money(n: number) { return `$${n.toLocaleString('en-US')}` }

interface Props {
  returnId: string
  stage: string
  viewerUserId: string
}

export function IndividualReturnSummary({ returnId, stage, viewerUserId }: Props) {
  const summary = getIndividualSummary(returnId)
  const addToast = useToastStore((s) => s.addToast)
  if (!summary) return null

  const readyForApproval = stage === 'waiting_for_client_approval'
  const filed = stage === 'filed'
  const approved = stage === 'ready_to_file'

  if (!readyForApproval && !filed && !approved) return null

  const approve = () => {
    clientApproveReturn(returnId, viewerUserId)
    addToast({ message: 'Thank you — your return is approved and ready to file.', type: 'success' })
  }

  if (filed) {
    return (
      <Card padding="lg" className="border-l-4 border-l-success-500">
        <div className="flex items-start gap-3">
          <PartyPopper className="h-6 w-6 text-success-600 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-text-primary">Your return has been filed</h2>
            <p className="text-sm text-text-secondary mt-1">
              Your {new Date().getFullYear() - 1} return was submitted successfully. You can download a copy for your records.
            </p>
            <Button className="mt-3" variant="secondary" onClick={() => addToast({ message: 'Downloading a copy of your return (simulated).', type: 'info' })}>
              <Download className="h-4 w-4" /> Download return (PDF)
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-base font-medium text-text-primary">Your return summary</h2>
        {readyForApproval ? <Badge variant="primary">Ready for your approval</Badge> : <Badge variant="success">Approved</Badge>}
      </div>
      <p className="text-sm text-text-muted mb-4">
        {readyForApproval ? 'Please review and approve your return for filing.' : 'You approved this return. Your preparer will file it.'}
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Figure label="Total income" value={money(summary.totalIncome)} />
        <Figure label="Tax withheld" value={money(summary.withholding)} />
        <Figure label="Estimated refund" value={money(summary.estimatedRefund)} highlight />
      </div>

      {readyForApproval && (
        <div className="mt-4 pt-3 border-t border-border-default">
          <p className="text-xs text-text-muted mb-2">
            By approving, you confirm the information is accurate to the best of your knowledge.
          </p>
          <Button onClick={approve}>
            <CheckCircle2 className="h-4 w-4" /> Review complete — approve my return
          </Button>
        </div>
      )}
    </Card>
  )
}

function Figure({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-success-500/40 bg-success-50/50' : 'border-border-default'}`}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${highlight ? 'text-success-700' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}
