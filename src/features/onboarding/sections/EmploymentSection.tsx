import { useOnboardingStore } from '@/store/onboarding-store'

export function EmploymentSection() {
  const { answers, setAnswer } = useOnboardingStore()

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Employment</h2>
      <p className="text-sm text-text-muted mb-6">
        Tell us about your income sources for 2025.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Did you have W-2 employment in 2025?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasW2"
                checked={answers.hasW2Employment === true}
                onChange={() => setAnswer('hasW2Employment', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasW2"
                checked={answers.hasW2Employment === false}
                onChange={() => setAnswer('hasW2Employment', false)}
                className="accent-primary-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {answers.hasW2Employment && (
          <div>
            <label htmlFor="employerCount" className="block text-sm font-medium text-text-secondary mb-2">
              How many employers?
            </label>
            <input
              id="employerCount"
              type="number"
              min="1"
              max="10"
              value={answers.employerCount || ''}
              onChange={(e) => setAnswer('employerCount', parseInt(e.target.value) || undefined)}
              className="w-24 rounded-md border border-border-default px-3 py-2 text-sm bg-surface-card text-text-primary focus:outline-2 focus:outline-border-focus"
            />
            <p className="text-xs text-text-muted mt-1">
              You'll need a W-2 from each employer.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Did you earn freelance, contract, or self-employment income?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasFreelance"
                checked={answers.hasFreelanceIncome === true}
                onChange={() => setAnswer('hasFreelanceIncome', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasFreelance"
                checked={answers.hasFreelanceIncome === false}
                onChange={() => setAnswer('hasFreelanceIncome', false)}
                className="accent-primary-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Did you receive unemployment benefits?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasUnemployment"
                checked={answers.hasUnemployment === true}
                onChange={() => setAnswer('hasUnemployment', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasUnemployment"
                checked={answers.hasUnemployment === false}
                onChange={() => setAnswer('hasUnemployment', false)}
                className="accent-primary-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
