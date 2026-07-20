import { useOnboardingStore } from '@/store/onboarding-store'

export function InvestmentsSection() {
  const { answers, setAnswer } = useOnboardingStore()

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Investments</h2>
      <p className="text-sm text-text-muted mb-6">
        Investment income needs to be reported on your return.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Did you have any investment accounts (stocks, bonds, mutual funds)?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasInvestments"
                checked={answers.hasInvestments === true}
                onChange={() => setAnswer('hasInvestments', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasInvestments"
                checked={answers.hasInvestments === false}
                onChange={() => setAnswer('hasInvestments', false)}
                className="accent-primary-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {answers.hasInvestments && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Did you receive dividends?
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
                <input
                  type="radio"
                  name="hasDividends"
                  checked={answers.hasDividends === true}
                  onChange={() => setAnswer('hasDividends', true)}
                  className="accent-primary-600"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
                <input
                  type="radio"
                  name="hasDividends"
                  checked={answers.hasDividends === false}
                  onChange={() => setAnswer('hasDividends', false)}
                  className="accent-primary-600"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Did you buy, sell, or trade cryptocurrency?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasCrypto"
                checked={answers.hasCrypto === true}
                onChange={() => setAnswer('hasCrypto', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasCrypto"
                checked={answers.hasCrypto === false}
                onChange={() => setAnswer('hasCrypto', false)}
                className="accent-primary-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Did you contribute to a retirement account (401k, IRA, Roth)?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasRetirement"
                checked={answers.hasRetirementContributions === true}
                onChange={() => setAnswer('hasRetirementContributions', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="hasRetirement"
                checked={answers.hasRetirementContributions === false}
                onChange={() => setAnswer('hasRetirementContributions', false)}
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
