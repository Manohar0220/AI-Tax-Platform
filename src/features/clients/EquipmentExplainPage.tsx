import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Upload, CheckCircle2, MessageSquarePlus, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import { Card } from '@/components/feedback'
import { Button, Textarea } from '@/components/forms'
import { cn } from '@/utils/cn'
import {
  submitEquipmentResponse, addSupportingDocument, EQUIPMENT_USAGE_LABELS, type EquipmentUsage,
} from '@/services/business-service'
import { postMessage } from '@/services/collaboration-service'

const USAGE_OPTIONS: { value: EquipmentUsage; label: string }[] = [
  { value: 'entirely', label: EQUIPMENT_USAGE_LABELS.entirely },
  { value: 'partly', label: EQUIPMENT_USAGE_LABELS.partly },
  { value: 'no', label: EQUIPMENT_USAGE_LABELS.no },
  { value: 'unsure', label: EQUIPMENT_USAGE_LABELS.unsure },
]

const REQUEST_ID = 'req-equipment-statement'
const ISSUE_ID = 'issue-equipment-use'
const RETURN_ID = 'RET-2001'

export function EquipmentExplainPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const threads = useDemoStore((s) => s.threads)
  const requests = useDemoStore((s) => s.requests)
  const addToast = useToastStore((s) => s.addToast)

  const [usage, setUsage] = useState<EquipmentUsage | null>(null)
  const [percentage, setPercentage] = useState('')
  const [explanation, setExplanation] = useState('')
  const [question, setQuestion] = useState('')
  const [askOpen, setAskOpen] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [uploading, setUploading] = useState(false)

  const request = requests.find((r) => r.id === REQUEST_ID)
  const alreadyDone = request?.status === 'fulfilled'

  const needsExplanation = usage === 'partly' || usage === 'no' || usage === 'unsure'
  const canSubmit =
    !!usage &&
    (usage !== 'partly' || (!!percentage && Number(percentage) > 0 && Number(percentage) <= 100)) &&
    (!needsExplanation || explanation.trim().length > 0)

  const handleUpload = () => {
    if (!currentUser) return
    setUploading(true)
    setTimeout(() => {
      addSupportingDocument(RETURN_ID, 'Equipment business-use statement', currentUser.id)
      setUploading(false)
      setUploaded(true)
      addToast({ message: 'Supporting document uploaded.', type: 'success' })
    }, 800)
  }

  const handleSubmit = () => {
    if (!usage || !currentUser) return
    submitEquipmentResponse({
      returnId: RETURN_ID,
      requestId: REQUEST_ID,
      issueId: ISSUE_ID,
      usage,
      percentage: usage === 'partly' ? Number(percentage) : undefined,
      explanation,
      byUserId: currentUser.id,
    })
    // Optional extra question to Maya.
    if (question.trim()) {
      const thread = useDemoStore.getState().threads.find((t) => t.linkedIssueId === ISSUE_ID && t.visibility === 'client_visible')
      if (thread) postMessage({ threadId: thread.id, senderId: currentUser.id, content: question.trim() })
    }
    addToast({ message: 'Your answer has been submitted. Your tax preparer will follow up if needed.', type: 'success' })
    navigate('/my-return')
  }

  if (alreadyDone) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card padding="lg" className="text-center">
          <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-text-primary">You've already answered this</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your equipment response has been submitted. Your tax preparer will follow up if anything else is needed.
          </p>
          <Button className="mt-4" onClick={() => navigate('/my-return')}>Back to home</Button>
        </Card>
      </div>
    )
  }

  void threads
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600"><Wrench className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">The $12,500 equipment purchase</h1>
            <p className="text-sm text-text-muted">A few details help us deduct this correctly.</p>
          </div>
        </div>
      </div>

      <Card padding="lg" className="space-y-5">
        {/* Main question */}
        <div>
          <p className="text-sm font-medium text-text-primary mb-2">Was this equipment used entirely for business?</p>
          <div className="space-y-2">
            {USAGE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-md border cursor-pointer',
                  usage === opt.value ? 'border-primary-500 bg-primary-50' : 'border-border-default hover:bg-neutral-50',
                )}
              >
                <input
                  type="radio"
                  name="usage"
                  checked={usage === opt.value}
                  onChange={() => setUsage(opt.value)}
                  className="accent-primary-600"
                />
                <span className="text-sm text-text-primary">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Conditional percentage */}
        {usage === 'partly' && (
          <div>
            <label htmlFor="pct" className="block text-sm font-medium text-text-primary mb-1">
              What percentage was used for business?
            </label>
            <div className="relative w-32">
              <input
                id="pct"
                type="number"
                min={1}
                max={100}
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full pr-8 pl-3 py-2 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">%</span>
            </div>
          </div>
        )}

        {/* Explanation */}
        <Textarea
          label={needsExplanation ? 'Add an explanation (required)' : 'Add an explanation (optional)'}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="e.g. It's a studio camera system used for client shoots."
        />

        {/* Upload receipt */}
        <div className="flex items-center gap-3">
          {uploaded ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-success-700">
              <CheckCircle2 className="h-4 w-4" /> Supporting document uploaded
            </span>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleUpload} disabled={uploading}>
              <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload a receipt (optional)'}
            </Button>
          )}
        </div>

        {/* Ask a question */}
        <div>
          {!askOpen ? (
            <button onClick={() => setAskOpen(true)} className="text-sm text-text-link hover:underline inline-flex items-center gap-1">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Ask your tax preparer a question instead
            </button>
          ) : (
            <Textarea
              label="Question for your tax preparer (optional)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Do you need the original invoice as well?"
            />
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          Submit answer
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
