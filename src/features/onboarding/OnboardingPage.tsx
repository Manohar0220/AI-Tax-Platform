import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Save, CheckCircle2 } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboarding-store'
import { Button } from '@/components/forms'
import { Card } from '@/components/feedback'
import { cn } from '@/utils/cn'
import { AboutYouSection } from './sections/AboutYouSection'
import { HouseholdSection } from './sections/HouseholdSection'
import { EmploymentSection } from './sections/EmploymentSection'
import { HomeSection } from './sections/HomeSection'
import { InvestmentsSection } from './sections/InvestmentsSection'
import { ReviewSection } from './sections/ReviewSection'

const SECTIONS = [
  { id: 'about', label: 'About You' },
  { id: 'household', label: 'Household' },
  { id: 'employment', label: 'Employment' },
  { id: 'home', label: 'Home' },
  { id: 'investments', label: 'Investments' },
  { id: 'review', label: 'Review' },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { currentSection, setSection, completeOnboarding, completed } = useOnboardingStore()

  const handleNext = () => {
    if (currentSection < SECTIONS.length - 1) {
      setSection(currentSection + 1)
    }
  }

  const handleBack = () => {
    if (currentSection > 0) {
      setSection(currentSection - 1)
    }
  }

  const handleComplete = () => {
    completeOnboarding()
    navigate('/my-return')
  }

  const handleSaveAndExit = () => {
    navigate('/my-return')
  }

  if (completed) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card padding="lg" className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            Your tax questionnaire is complete
          </h1>
          <p className="text-sm text-text-secondary mb-4">
            Your answers have been saved. Your tax preparer will use them to prepare your return.
          </p>
          <Button onClick={() => navigate('/my-return')}>Go to my return</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-text-primary">
            Step {currentSection + 1} of {SECTIONS.length}
          </p>
          <p className="text-sm text-text-muted">
            {SECTIONS[currentSection].label}
          </p>
        </div>
        <div className="flex gap-1">
          {SECTIONS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= currentSection ? 'bg-primary-500' : 'bg-neutral-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Section content */}
      <Card padding="lg" className="mb-4">
        {currentSection === 0 && <AboutYouSection />}
        {currentSection === 1 && <HouseholdSection />}
        {currentSection === 2 && <EmploymentSection />}
        {currentSection === 3 && <HomeSection />}
        {currentSection === 4 && <InvestmentsSection />}
        {currentSection === 5 && <ReviewSection />}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {currentSection > 0 && (
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleSaveAndExit}>
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save and continue later</span>
            <span className="sm:hidden">Save</span>
          </Button>
          {currentSection < SECTIONS.length - 1 ? (
            <Button onClick={handleNext}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete}>
              Submit answers
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
