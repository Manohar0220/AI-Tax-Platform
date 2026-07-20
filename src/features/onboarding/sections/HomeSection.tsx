import { useOnboardingStore } from '@/store/onboarding-store'

export function HomeSection() {
  const { answers, setAnswer } = useOnboardingStore()

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Home</h2>
      <p className="text-sm text-text-muted mb-6">
        Homeownership can affect your deductions and credits.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Do you own a home?
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="ownsHome"
                checked={answers.ownsHome === true}
                onChange={() => setAnswer('ownsHome', true)}
                className="accent-primary-600"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
              <input
                type="radio"
                name="ownsHome"
                checked={answers.ownsHome === false}
                onChange={() => setAnswer('ownsHome', false)}
                className="accent-primary-600"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {answers.ownsHome && (
          <>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Did you buy, sell, or refinance a home in 2025?
              </label>
              <div className="space-y-2">
                {([
                  { value: 'none', label: 'No, none of these' },
                  { value: 'bought', label: 'I bought a home' },
                  { value: 'sold', label: 'I sold a home' },
                  { value: 'refinanced', label: 'I refinanced my mortgage' },
                ] as const).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50"
                  >
                    <input
                      type="radio"
                      name="homeAction"
                      value={opt.value}
                      checked={answers.homeAction === opt.value}
                      onChange={() => setAnswer('homeAction', opt.value)}
                      className="accent-primary-600"
                    />
                    <span className="text-sm text-text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Do you have a mortgage?
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
                  <input
                    type="radio"
                    name="hasMortgage"
                    checked={answers.hasMortgage === true}
                    onChange={() => setAnswer('hasMortgage', true)}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-md border border-border-default hover:bg-neutral-50 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center">
                  <input
                    type="radio"
                    name="hasMortgage"
                    checked={answers.hasMortgage === false}
                    onChange={() => setAnswer('hasMortgage', false)}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
              {answers.hasMortgage && (
                <p className="text-xs text-primary-700 mt-2 p-2 bg-primary-50 rounded">
                  You'll need to upload your mortgage interest statement (Form 1098) from your lender.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
