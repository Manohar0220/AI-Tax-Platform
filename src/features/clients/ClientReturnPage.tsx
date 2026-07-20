import { CheckCircle2, Circle } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { cn } from '@/utils/cn'
import { BusinessReturnSummary } from './BusinessReturnSummary'
import { IndividualReturnSummary } from './IndividualReturnSummary'
import { StatusPanel } from '@/features/status/StatusPanel'

interface StepInfo {
  id: string
  label: string
  description: string
}

const STEPS: StepInfo[] = [
  { id: 'info', label: 'Information received', description: 'We have your documents and answers.' },
  { id: 'prep', label: 'Preparation', description: 'Your tax preparer is building your return.' },
  { id: 'review', label: 'Review', description: 'A senior reviewer checks everything for accuracy.' },
  { id: 'approval', label: 'Your approval', description: 'You review the return and give final approval.' },
  { id: 'filing', label: 'Filing', description: 'Your return is submitted to the IRS.' },
]

const STAGE_TO_STEP: Record<string, number> = {
  collecting_information: 0,
  waiting_on_client: 0,
  ready_to_prepare: 1,
  preparing: 1,
  ready_for_review: 2,
  under_review: 2,
  changes_requested: 1,
  waiting_for_client_approval: 3,
  ready_to_file: 4,
  filed: 5,
  filing_rejected: 4,
}

export function ClientReturnPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)

  const client = clients.find((c) => c.userId === currentUser?.id)
  const taxReturn = returns.find((r) => r.clientId === client?.id)

  if (!taxReturn) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Card padding="lg" className="text-center">
          <p className="text-text-muted">No return found.</p>
        </Card>
      </div>
    )
  }

  const currentStep = STAGE_TO_STEP[taxReturn.stage] ?? 0

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Your {taxReturn.taxYear} Tax Return</h1>
        <p className="text-sm text-text-muted mt-1">
          {taxReturn.type === 'business' ? 'Business return' : 'Individual return'} — Due {new Date(taxReturn.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Business return summary (business clients only) */}
      {taxReturn.type === 'business' && currentUser && (
        <BusinessReturnSummary returnId={taxReturn.id} stage={taxReturn.stage} viewerUserId={currentUser.id} />
      )}

      {/* Individual return summary / approval / filing (individual clients only) */}
      {taxReturn.type === 'individual' && currentUser && (
        <IndividualReturnSummary returnId={taxReturn.id} stage={taxReturn.stage} viewerUserId={currentUser.id} />
      )}

      {/* Current status — shared status system, client audience */}
      <StatusPanel taxReturn={taxReturn} audience="client" />

      {/* Timeline */}
      <Card padding="lg">
        <h2 className="text-base font-medium text-text-primary mb-4">Progress timeline</h2>
        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentStep
            const isCurrent = i === currentStep
            const isLast = i === STEPS.length - 1

            return (
              <div key={step.id} className="flex gap-3">
                {/* Vertical line and dot */}
                <div className="flex flex-col items-center">
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-success-600 shrink-0" />
                  ) : isCurrent ? (
                    <div className="h-6 w-6 rounded-full border-2 border-primary-500 bg-primary-50 flex items-center justify-center shrink-0">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                    </div>
                  ) : (
                    <Circle className="h-6 w-6 text-neutral-300 shrink-0" />
                  )}
                  {!isLast && (
                    <div className={cn(
                      'w-0.5 flex-1 min-h-[2rem]',
                      isCompleted ? 'bg-success-500' : 'bg-neutral-200'
                    )} />
                  )}
                </div>

                {/* Step content */}
                <div className={cn('pb-6', isLast && 'pb-0')}>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'text-sm font-medium',
                      isCurrent ? 'text-primary-700' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                    )}>
                      {step.label}
                    </p>
                    {isCurrent && <Badge variant="primary">Current</Badge>}
                    {isCompleted && <Badge variant="success">Done</Badge>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
