import { CheckCircle2, Circle } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboarding-store'

export function ReviewSection() {
  const { answers } = useOnboardingStore()

  const items = [
    { label: 'Filing status', answered: !!answers.filingStatus },
    { label: 'Household information', answered: answers.hasDependents !== undefined },
    { label: 'Employment income', answered: answers.hasW2Employment !== undefined },
    { label: 'Home ownership', answered: answers.ownsHome !== undefined },
    { label: 'Investment income', answered: answers.hasInvestments !== undefined },
  ]

  const answeredCount = items.filter((i) => i.answered).length

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Review your answers</h2>
      <p className="text-sm text-text-muted mb-6">
        Here's a summary of what you've told us. You can go back to change any answer.
      </p>

      <div className="mb-6">
        <p className="text-sm text-text-secondary">
          {answeredCount} of {items.length} sections answered
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            {item.answered ? (
              <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" aria-label="Completed" />
            ) : (
              <Circle className="h-5 w-5 text-neutral-300 shrink-0" aria-label="Not completed" />
            )}
            <span className="text-sm text-text-primary">{item.label}</span>
          </li>
        ))}
      </ul>

      {answers.ownsHome && answers.hasMortgage && (
        <div className="mt-6 p-3 bg-primary-50 border border-primary-200 rounded-md">
          <p className="text-sm text-primary-800">
            Based on your answers, we'll need your mortgage interest statement (Form 1098) from your lender.
            You can upload it after completing this questionnaire.
          </p>
        </div>
      )}

      {answeredCount === items.length && (
        <div className="mt-6 p-3 bg-success-50 border border-success-500 rounded-md">
          <p className="text-sm text-success-800">
            All sections are complete. Click "Submit answers" to send your information to your tax preparer.
          </p>
        </div>
      )}
    </div>
  )
}
