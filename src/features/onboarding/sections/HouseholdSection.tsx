import { useOnboardingStore } from '@/store/onboarding-store'

export function HouseholdSection() {
  const { answers, setAnswer } = useOnboardingStore()

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Household</h2>
      <p className="text-sm text-text-muted mb-6">
        Tell us about your household so we can identify applicable credits.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Do you have dependents (children or others you support)?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasDependents"
                checked={answers.hasDependents === true}
                onChange={() => setAnswer('hasDependents', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasDependents"
                checked={answers.hasDependents === false}
                onChange={() => setAnswer('hasDependents', false)}
                className="accent-primary-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {answers.hasDependents && (
          <>
            <div>
              <label htmlFor="dependentCount" className="block text-sm font-medium text-text-secondary mb-2">
                How many dependents?
              </label>
              <input
                id="dependentCount"
                type="number"
                min="1"
                max="10"
                value={answers.dependentCount || ''}
                onChange={(e) => setAnswer('dependentCount', parseInt(e.target.value) || undefined)}
                className="w-24 rounded-md border border-border-default px-3 py-2 text-sm bg-surface-card text-text-primary focus:outline-2 focus:outline-border-focus"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Did you pay for childcare or dependent care in 2025?
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
                  <input
                    type="radio"
                    name="hasChildcare"
                    checked={answers.hasChildcare === true}
                    onChange={() => setAnswer('hasChildcare', true)}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
                  <input
                    type="radio"
                    name="hasChildcare"
                    checked={answers.hasChildcare === false}
                    onChange={() => setAnswer('hasChildcare', false)}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
