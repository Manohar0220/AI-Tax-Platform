import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboarding-store'
import { Button } from '@/components/forms'
import { Card } from '@/components/feedback'
import { cn } from '@/utils/cn'

const SECTIONS = [
  { id: 'about', label: 'About you' },
  { id: 'income', label: 'Income and property' },
  { id: 'review', label: 'Review' },
]

export function IndividualOnboardingPage() {
  const navigate = useNavigate()
  const { currentSection, setSection, completeOnboarding, completed, answers, setAnswer } = useOnboardingStore()

  const handleNext = () => { if (currentSection < SECTIONS.length - 1) setSection(currentSection + 1) }
  const handleBack = () => { if (currentSection > 0) setSection(currentSection - 1) }
  const handleComplete = () => { completeOnboarding(); navigate('/my-return') }

  if (completed) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card padding="lg" className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">Your questionnaire is complete</h1>
          <p className="text-sm text-text-secondary mb-4">
            Your answers have been saved. Your tax preparer will use them to prepare your return.
          </p>
          <Button onClick={() => navigate('/my-return')}>Continue to my document checklist</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-text-primary">Step {currentSection + 1} of {SECTIONS.length}</p>
          <p className="text-sm text-text-muted">{SECTIONS[currentSection].label}</p>
        </div>
        <div className="flex gap-1">
          {SECTIONS.map((_, i) => (
            <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= currentSection ? 'bg-primary-500' : 'bg-neutral-200')} />
          ))}
        </div>
      </div>

      <Card padding="lg" className="mb-4">
        {currentSection === 0 && <AboutYouSection answers={answers} setAnswer={setAnswer} />}
        {currentSection === 1 && <IncomePropertySection answers={answers} setAnswer={setAnswer} />}
        {currentSection === 2 && <ReviewSection answers={answers} onComplete={handleComplete} />}
      </Card>

      {/* Nav buttons (not shown on Review — Review has its own CTA) */}
      {currentSection < 2 && (
        <div className="flex items-center justify-between gap-3">
          <div>
            {currentSection > 0 && (
              <Button variant="ghost" onClick={handleBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
            )}
          </div>
          <Button onClick={handleNext}>Continue <ArrowRight className="h-4 w-4" /></Button>
        </div>
      )}
      {currentSection === 2 && (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={handleBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        </div>
      )}
    </div>
  )
}

// ─────────────────── Helpers ───────────────────

type Answers = ReturnType<typeof useOnboardingStore.getState>['answers']
type SetAnswer = ReturnType<typeof useOnboardingStore.getState>['setAnswer']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><p className="text-sm font-medium text-text-secondary">{label}</p>{children}</div>
}

function YesNo({ name, value, onChange }: { name: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {([true, false] as const).map((v) => (
        <label key={String(v)} className={cn('flex items-center gap-2 p-3 rounded-md border cursor-pointer flex-1 justify-center', value === v ? 'border-primary-500 bg-primary-50' : 'border-border-default hover:bg-neutral-50')}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="accent-primary-600" />
          <span className="text-sm">{v ? 'Yes' : 'No'}</span>
        </label>
      ))}
    </div>
  )
}

// ─────────────────── Step 1: About you ───────────────────

function AboutYouSection({ answers, setAnswer }: { answers: Answers; setAnswer: SetAnswer }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">About you</h2>

      <Field label="What is your filing status?">
        <div className="space-y-2">
          {([
            { value: 'single', label: 'Single' },
            { value: 'married_jointly', label: 'Married, filing jointly' },
            { value: 'married_separately', label: 'Married, filing separately' },
            { value: 'head_of_household', label: 'Head of household' },
          ] as const).map((opt) => (
            <label key={opt.value} className={cn('flex items-center gap-3 p-3 rounded-md border cursor-pointer', answers.filingStatus === opt.value ? 'border-primary-500 bg-primary-50' : 'border-border-default hover:bg-neutral-50')}>
              <input type="radio" name="filingStatus" checked={answers.filingStatus === opt.value} onChange={() => setAnswer('filingStatus', opt.value)} className="accent-primary-600" />
              <span className="text-sm text-text-primary">{opt.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Do you have any dependants?">
        <YesNo name="hasDependents" value={answers.hasDependents} onChange={(v) => setAnswer('hasDependents', v)} />
      </Field>
    </div>
  )
}

// ─────────────────── Step 2: Income and property ───────────────────

function IncomePropertySection({ answers, setAnswer }: { answers: Answers; setAnswer: SetAnswer }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Income and property</h2>

      <Field label="Did you work for an employer? (W-2 income)">
        <YesNo name="hasW2" value={answers.hasW2Employment} onChange={(v) => setAnswer('hasW2Employment', v)} />
      </Field>

      <Field label="Did you receive bank interest or investment income?">
        <YesNo name="hasInvestments" value={answers.hasInvestments} onChange={(v) => setAnswer('hasInvestments', v)} />
      </Field>

      <Field label="Did you own, buy, sell, or refinance a home in 2025?">
        <div className="space-y-2">
          {([
            { value: 'none', label: 'No' },
            { value: 'bought', label: 'I bought a home' },
            { value: 'sold', label: 'I sold a home' },
            { value: 'refinanced', label: 'I refinanced my mortgage' },
          ] as const).map((opt) => (
            <label key={opt.value} className={cn('flex items-center gap-3 p-3 rounded-md border cursor-pointer', answers.homeAction === opt.value ? 'border-primary-500 bg-primary-50' : 'border-border-default hover:bg-neutral-50')}>
              <input type="radio" name="homeAction" checked={answers.homeAction === opt.value} onChange={() => setAnswer('homeAction', opt.value)} className="accent-primary-600" />
              <span className="text-sm text-text-primary">{opt.label}</span>
            </label>
          ))}
        </div>
      </Field>

      {(answers.homeAction === 'refinanced' || answers.homeAction === 'bought') && (
        <p className="text-xs text-primary-700 p-2.5 bg-primary-50 rounded">
          You will need to upload your mortgage interest statement (Form 1098) from your lender.
        </p>
      )}
    </div>
  )
}

// ─────────────────── Step 3: Review ───────────────────

function ReviewSection({ answers, onComplete }: { answers: Answers; onComplete: () => void }) {
  const rows: { label: string; value: string }[] = []

  if (answers.filingStatus) {
    const labels: Record<string, string> = { single: 'Single', married_jointly: 'Married, filing jointly', married_separately: 'Married, filing separately', head_of_household: 'Head of household' }
    rows.push({ label: 'Filing status', value: labels[answers.filingStatus] ?? answers.filingStatus })
  }
  rows.push({ label: 'Has dependants', value: answers.hasDependents === undefined ? 'Not answered' : answers.hasDependents ? 'Yes' : 'No' })
  rows.push({ label: 'Employer income (W-2)', value: answers.hasW2Employment === undefined ? 'Not answered' : answers.hasW2Employment ? 'Yes' : 'No' })
  rows.push({ label: 'Bank / investment income', value: answers.hasInvestments === undefined ? 'Not answered' : answers.hasInvestments ? 'Yes' : 'No' })

  if (answers.homeAction) {
    const labels: Record<string, string> = { none: 'No', bought: 'Bought a home', sold: 'Sold a home', refinanced: 'Refinanced' }
    rows.push({ label: 'Home activity', value: labels[answers.homeAction] ?? answers.homeAction })
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-text-primary">Review your answers</h2>
      <ul className="divide-y divide-border-default">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between py-2 text-sm">
            <span className="text-text-muted">{r.label}</span>
            <span className="font-medium text-text-primary">{r.value}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full" onClick={onComplete}>
        <CheckCircle2 className="h-4 w-4" /> Continue to my document checklist
      </Button>
    </div>
  )
}
