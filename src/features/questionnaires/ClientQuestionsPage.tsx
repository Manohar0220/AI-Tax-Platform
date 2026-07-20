import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, HelpCircle, FileText, ChevronDown, ChevronUp, ClipboardList, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useQuestionnaireStore } from '@/store/questionnaire-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { useToastStore } from '@/store/toast-store'
import type { QuestionItem } from '@/data/questionnaires'

export function ClientQuestionsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const clients = useDemoStore((s) => s.clients)
  const returns = useDemoStore((s) => s.returns)

  const client = clients.find((c) => c.userId === currentUser?.id)
  const taxReturn = returns.find((r) => r.clientId === client?.id)

  const questions = useQuestionnaireStore((s) => s.questions)
  // Only show questions the preparer has explicitly sent to the client.
  const returnQuestions = questions.filter(
    (q) => q.returnId === taxReturn?.id && q.sentToClient === true,
  )

  const unanswered = returnQuestions.filter((q) => !q.answer)
  const answered = returnQuestions.filter((q) => !!q.answer)

  const categories = [...new Set(returnQuestions.map((q) => q.category))]

  const onboardingCompleted = useOnboardingStore((s) => s.completed)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Questions</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {unanswered.length > 0
            ? `${unanswered.length} question${unanswered.length > 1 ? 's' : ''} need your answer`
            : returnQuestions.length === 0
              ? 'No questions yet'
              : 'All questions answered'}
        </p>
      </div>

      {!onboardingCompleted && (
        <Card padding="md" className="mb-4 border-l-4 border-l-primary-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600 shrink-0">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Finish your intake questionnaire</p>
              <p className="text-sm text-text-secondary mt-0.5">
                Answer a few quick questions about your year so your preparer has what they need to begin.
              </p>
              <Link
                to="/my-return/onboarding"
                className="inline-flex items-center gap-1 text-sm text-text-link hover:underline mt-2"
              >
                Continue questionnaire
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Card>
      )}

      {onboardingCompleted && returnQuestions.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-sm font-medium text-text-primary mb-1">No questions yet</p>
          <p className="text-sm text-text-muted">
            Your tax preparer will contact you if more information is needed.
          </p>
        </Card>
      )}

      {unanswered.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
            Needs your answer
          </h2>
          <div className="space-y-3">
            {unanswered.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        </div>
      )}

      {answered.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
            Completed ({answered.length})
          </h2>
          <div className="space-y-2">
            {categories.map((cat) => {
              const catAnswered = answered.filter((q) => q.category === cat)
              if (catAnswered.length === 0) return null
              return (
                <div key={cat}>
                  {catAnswered.map((q) => (
                    <CompletedQuestionCard key={q.id} question={q} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionCard({ question }: { question: QuestionItem }) {
  const [expanded, setExpanded] = useState(true)
  const [localAnswer, setLocalAnswer] = useState('')
  const answerQuestion = useQuestionnaireStore((s) => s.answerQuestion)
  const addToast = useToastStore((s) => s.addToast)

  const handleSubmit = (answer: string) => {
    answerQuestion(question.id, answer)
    addToast({ message: 'Answer saved.', type: 'success', duration: 3000 })
  }

  return (
    <Card padding="md" className="border-l-4 border-l-primary-500">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <HelpCircle className="h-5 w-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{question.question}</p>
            <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-1 text-text-muted hover:text-text-primary">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default">{question.category}</Badge>
            {question.relatedTopic && (
              <span className="text-xs text-text-muted">{question.relatedTopic}</span>
            )}
          </div>

          {expanded && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-3 p-2 bg-neutral-50 rounded">
                <span className="font-medium">Why we ask:</span> {question.reason}
              </p>

              {question.relatedDocumentId && (
                <div className="flex items-center gap-1.5 text-xs text-text-link mb-3">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Related to an uploaded document</span>
                </div>
              )}

              {question.type === 'yes_no' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleSubmit('yes')}>Yes</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSubmit('no')}>No</Button>
                </div>
              )}

              {question.type === 'text' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localAnswer}
                    onChange={(e) => setLocalAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus"
                  />
                  <Button size="sm" onClick={() => { handleSubmit(localAnswer); setLocalAnswer('') }} disabled={!localAnswer.trim()}>
                    Save
                  </Button>
                </div>
              )}

              {question.type === 'select' && question.options && (
                <div className="space-y-1.5">
                  {question.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSubmit(opt)}
                      className="w-full text-left p-2.5 text-sm rounded-md border border-border-default hover:bg-neutral-50 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'currency' && (
                <div className="flex gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
                    <input
                      type="number"
                      value={localAnswer}
                      onChange={(e) => setLocalAnswer(e.target.value)}
                      placeholder="0.00"
                      className="pl-7 pr-3 py-1.5 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus w-40"
                    />
                  </div>
                  <Button size="sm" onClick={() => { handleSubmit(localAnswer); setLocalAnswer('') }} disabled={!localAnswer.trim()}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function CompletedQuestionCard({ question }: { question: QuestionItem }) {
  const [showEdit, setShowEdit] = useState(false)
  const clearAnswer = useQuestionnaireStore((s) => s.clearAnswer)

  return (
    <Card padding="sm" className="mb-2">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-4.5 w-4.5 text-success-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">{question.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-text-secondary">
              {question.answer === 'yes' ? 'Yes' : question.answer === 'no' ? 'No' : question.answer}
            </span>
            {question.answeredAt && (
              <span className="text-xs text-text-muted">
                {new Date(question.answeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {showEdit && (
            <div className="mt-2">
              <Button size="sm" variant="ghost" onClick={() => { clearAnswer(question.id); setShowEdit(false) }}>
                Clear answer
              </Button>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowEdit(!showEdit)}
          className="text-xs text-text-link hover:underline shrink-0"
        >
          Edit
        </button>
      </div>
    </Card>
  )
}
