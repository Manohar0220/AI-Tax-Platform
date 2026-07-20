import { Clock, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/forms'
import { useOnboardingStore } from '@/store/onboarding-store'

export function BusinessOnboardingLanding() {
  const navigate = useNavigate()
  const status = useOnboardingStore((s) => s.status)
  const inProgress = status === 'in_progress'

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          {inProgress ? 'Welcome back.' : "Let's start your business tax return."}
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          {inProgress
            ? 'You have a questionnaire in progress. Pick up where you left off.'
            : "Answer a few questions about your business and we'll create your document checklist."}
        </p>

        {!inProgress && (
          <div className="flex justify-center gap-6 text-sm text-text-muted mb-6">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> About 5 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Progress is saved automatically
            </span>
          </div>
        )}

        <Button onClick={() => navigate('/my-return/onboarding')}>
          {inProgress ? 'Continue setup' : 'Start my business return'}
        </Button>
      </div>
    </div>
  )
}
