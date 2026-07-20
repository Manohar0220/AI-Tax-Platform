import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboarding-store'
import { Button } from '@/components/forms'
import { Card } from '@/components/feedback'
import { cn } from '@/utils/cn'

const SECTIONS = [
  { id: 'details', label: 'Business details' },
  { id: 'activity', label: 'Business activity' },
  { id: 'review', label: 'Review' },
]

export function BusinessOnboardingPage() {
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
            Your answers have been saved. Your tax preparer will use them to prepare your business return.
          </p>
          <Button onClick={() => navigate('/my-return')}>Continue to my business checklist</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
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
        {currentSection === 0 && <BizDetailsSection answers={answers} setAnswer={setAnswer} />}
        {currentSection === 1 && <BizActivitySection answers={answers} setAnswer={setAnswer} />}
        {currentSection === 2 && <BizReviewSection answers={answers} onComplete={handleComplete} />}
      </Card>

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

// ─────────────────── Step 1: Business details ───────────────────

function BizDetailsSection({ answers, setAnswer }: { answers: Answers; setAnswer: SetAnswer }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Business details</h2>

      <Field label="Business type">
        <div className="space-y-2">
          {(['Sole proprietor', 'LLC', 'S-Corp', 'C-Corp', 'Partnership', 'Other'] as const).map((v) => (
            <label key={v} className={cn('flex items-center gap-3 p-3 rounded-md border cursor-pointer', answers.entityType === v ? 'border-primary-500 bg-primary-50' : 'border-border-default hover:bg-neutral-50')}>
              <input type="radio" name="entityType" checked={answers.entityType === v} onChange={() => setAnswer('entityType', v)} className="accent-primary-600" />
              <span className="text-sm text-text-primary">{v}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Was the business active during 2025?">
        <YesNo name="wasActiveInYear" value={answers.wasActiveInYear} onChange={(v) => setAnswer('wasActiveInYear', v)} />
      </Field>
    </div>
  )
}

// ─────────────────── Step 2: Business activity ───────────────────

function BizActivitySection({ answers, setAnswer }: { answers: Answers; setAnswer: SetAnswer }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Business activity</h2>

      <Field label="Did the business earn income in 2025?">
        <YesNo name="hasBusinessIncome" value={answers.hasBusinessIncome} onChange={(v) => setAnswer('hasBusinessIncome', v)} />
      </Field>

      <Field label="Did it have employees or contractors?">
        <YesNo name="hasEmployees" value={answers.hasEmployees} onChange={(v) => setAnswer('hasEmployees', v)} />
      </Field>

      <Field label="Did it purchase any equipment or significant assets?">
        <YesNo name="hasMajorPurchases" value={answers.hasMajorPurchases} onChange={(v) => setAnswer('hasMajorPurchases', v)} />
      </Field>
    </div>
  )
}

// ─────────────────── Step 3: Review ───────────────────

function BizReviewSection({ answers, onComplete }: { answers: Answers; onComplete: () => void }) {
  const rows: { label: string; value: string }[] = []

  if (answers.entityType) rows.push({ label: 'Business type', value: answers.entityType })
  rows.push({ label: 'Active in 2025', value: answers.wasActiveInYear === undefined ? 'Not answered' : answers.wasActiveInYear ? 'Yes' : 'No' })
  rows.push({ label: 'Earned income', value: answers.hasBusinessIncome === undefined ? 'Not answered' : answers.hasBusinessIncome ? 'Yes' : 'No' })
  rows.push({ label: 'Employees or contractors', value: answers.hasEmployees === undefined ? 'Not answered' : answers.hasEmployees ? 'Yes' : 'No' })
  rows.push({ label: 'Equipment purchases', value: answers.hasMajorPurchases === undefined ? 'Not answered' : answers.hasMajorPurchases ? 'Yes' : 'No' })

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
        <CheckCircle2 className="h-4 w-4" /> Continue to my business checklist
      </Button>
    </div>
  )
}
