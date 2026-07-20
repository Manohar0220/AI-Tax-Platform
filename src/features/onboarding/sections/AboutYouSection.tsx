import { useOnboardingStore } from '@/store/onboarding-store'

export function AboutYouSection() {
  const { answers, setAnswer } = useOnboardingStore()

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">About you</h2>
      <p className="text-sm text-text-muted mb-6">
        Let's start with some basic information about your filing situation.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            What is your filing status for 2025?
          </label>
          <div className="space-y-2">
            {([
              { value: 'single', label: 'Single' },
              { value: 'married_jointly', label: 'Married, filing jointly' },
              { value: 'married_separately', label: 'Married, filing separately' },
              { value: 'head_of_household', label: 'Head of household' },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
              >
                <input
                  type="radio"
                  name="filingStatus"
                  value={opt.value}
                  checked={answers.filingStatus === opt.value}
                  onChange={() => setAnswer('filingStatus', opt.value)}
                  className="accent-primary-600"
                />
                <span className="text-sm text-text-primary">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-text-secondary mb-2">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            value={answers.dateOfBirth || ''}
            onChange={(e) => setAnswer('dateOfBirth', e.target.value)}
            className="w-full max-w-xs rounded-md border border-border-default px-3 py-2 text-sm bg-surface-card text-text-primary focus:outline-2 focus:outline-border-focus"
          />
        </div>
      </div>
    </div>
  )
}
