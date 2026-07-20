import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  MessageSquare,
  ArrowRight,
  FileText,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { useToastStore } from '@/store/toast-store'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { ClientOnboardingLanding } from './ClientOnboardingLanding'
import { BusinessOnboardingLanding } from './BusinessOnboardingLanding'
import { buildClientChecklist, isRelevant } from '@/services/checklist-service'
import { isManagedClientUser } from '@/services/managed-returns'
import { simulateUpload } from '@/services/document-service'

const CLIENT_STAGE_LABELS: Record<string, string> = {
  collecting_information: 'Gathering your documents',
  waiting_on_client: 'Waiting for your information',
  ready_to_prepare: 'Ready for preparer review',
  preparing: 'Your preparer is working on it',
  ready_for_review: 'Being reviewed',
  under_review: 'Being reviewed',
  changes_requested: 'Your preparer is making updates',
  waiting_for_client_approval: 'Ready for your review',
  ready_to_file: 'About to be filed',
  filed: 'Filed',
  filing_rejected: 'Needs attention',
}

/** One-click simulated upload: no file picker. */
function OneClickUpload({ documentId, documentName }: { documentId: string; documentName: string }) {
  const [state, setState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const addToast = useToastStore((s) => s.addToast)

  const handleClick = () => {
    if (state !== 'idle') return
    setState('uploading')
    simulateUpload(
      documentId,
      documentName,
      () => {},
      () => {
        setState('done')
        addToast({ message: 'Document added successfully.', type: 'success' })
      },
    )
  }

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-success-700">
        <CheckCircle2 className="h-4 w-4" /> Document added successfully.
      </span>
    )
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={state === 'uploading'}>
      {state === 'uploading' ? (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
      ) : (
        'Upload document'
      )}
    </Button>
  )
}

export function ClientHomePage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const activeRole = useAuthStore((s) => s.activeRole)
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const requests = useDemoStore((s) => s.requests)
  const documents = useDemoStore((s) => s.documents)
  const threads = useDemoStore((s) => s.threads)
  const messages = useDemoStore((s) => s.messages)
  const onboardingCompleted = useOnboardingStore((s) => s.completed)
  // Only the two demo clients are gated behind onboarding; other client users
  // (e.g. a preparer's mature personal return) go straight to their home.
  const effectiveCompleted = onboardingCompleted || !isManagedClientUser(currentUser?.id)

  const client = clients.find((c) => c.userId === currentUser?.id)
  const taxReturn = returns.find((r) => r.clientId === client?.id)

  // ── Pre-onboarding landing ──────────────────────────────────────────────
  if (!effectiveCompleted || !taxReturn || !client) {
    if (activeRole === 'business_owner') return <BusinessOnboardingLanding />
    return <ClientOnboardingLanding />
  }

  // ── Post-onboarding home ────────────────────────────────────────────────

  const isBusiness = client.type === 'business'
  const answers = useOnboardingStore.getState().answers

  // Build the conditional checklist from onboarding answers.
  const checklist = buildClientChecklist(
    isBusiness ? 'business' : 'individual',
    answers,
    onboardingCompleted,
  )

  // Any pending request the preparer created is real and must always show —
  // an explicit request overrides the onboarding-answer relevance filter.
  const pendingRequests = requests.filter(
    (r) => r.clientId === client.id && (r.status === 'pending' || r.status === 'overdue'),
  )
  // A missing document is only shown to the client once the preparer has
  // created a request that references it.
  const requestedDocIds = new Set(pendingRequests.map((r) => r.linkedDocumentId).filter(Boolean) as string[])
  const returnDocs = documents.filter(
    (d) =>
      d.returnId === taxReturn.id &&
      // Show if relevant to the onboarding answers OR explicitly requested by the preparer.
      (isRelevant(checklist.relevantDocIds, d.id) || requestedDocIds.has(d.id)) &&
      (d.status !== 'missing' || requestedDocIds.has(d.id)),
  )
  const receivedDocs = returnDocs.filter((d) => d.status !== 'missing')
  const missingDocs = returnDocs.filter((d) => d.status === 'missing')

  const clientThreads = threads.filter((t) => t.returnId === taxReturn.id && t.visibility === 'client_visible')
  const latestThread = [...clientThreads].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))[0]
  const latestMessage = latestThread
    ? messages.filter((m) => m.threadId === latestThread.id && m.senderId !== currentUser?.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0]
    : null

  const primaryRequest = pendingRequests[0]
  const primaryIsEquipment = !!primaryRequest &&
    (primaryRequest.linkedDocumentId === 'doc-rp-equipment' || primaryRequest.id === 'req-equipment-statement')
  // Find the linked document for the primary request (for one-click upload).
  const primaryDocId = primaryRequest?.linkedDocumentId ?? missingDocs[0]?.id
  const primaryDoc = documents.find(
    (d) => d.id === primaryDocId && (isRelevant(checklist.relevantDocIds, d.id) || requestedDocIds.has(d.id)),
  )

  // Stage-based state.
  // "Waiting on client" is only ever set by an explicit preparer action
  // (a document request or a question), so it's the only stage that should tell
  // the client their preparer needs something. `collecting_information` is the
  // neutral gathering stage — it must not claim the preparer requested anything.
  const stage = taxReturn.stage
  const waitingForClient = stage === 'waiting_on_client'
  const waitingForPreparer = ['ready_to_prepare', 'preparing', 'ready_for_review', 'under_review', 'changes_requested'].includes(stage)
  const needsApproval = stage === 'waiting_for_client_approval'
  const isFiled = stage === 'filed'

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Greeting — no personal name */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Welcome back.</h1>
        <p className="text-sm text-text-muted mt-1">
          {isBusiness
            ? `Here's where things stand with your ${taxReturn.taxYear} business tax return.`
            : `Here's where things stand with your ${taxReturn.taxYear} tax return.`}
        </p>
      </div>

      {/* ── Primary next-action card ──────────────────────────────────── */}
      {isFiled ? (
        <Card padding="lg" className="border-l-4 border-l-success-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success-50 text-success-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-text-primary mb-1">Your return has been filed</h2>
              <p className="text-sm text-text-secondary">
                Your {taxReturn.taxYear} tax return was filed successfully. No further action is needed.
              </p>
            </div>
          </div>
        </Card>
      ) : needsApproval ? (
        <Card padding="lg" className="border-l-4 border-l-primary-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-text-primary mb-1">Your return is ready to review</h2>
              <p className="text-sm text-text-secondary mb-3">
                Your tax preparer has completed your return. Please review the summary and approve it for filing.
              </p>
              <Button size="sm" onClick={() => navigate('/my-return/details')}>
                Review and approve
              </Button>
            </div>
          </div>
        </Card>
      ) : waitingForPreparer ? (
        <Card padding="lg" className="border-l-4 border-l-success-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success-50 text-success-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-text-primary mb-1">No action is currently required from you</h2>
              <p className="text-sm text-text-secondary">
                Your tax preparer will review the information you submitted. We'll let you know when something needs your attention.
              </p>
            </div>
          </div>
        </Card>
      ) : primaryRequest ? (
        <Card padding="lg" className="border-l-4 border-l-primary-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-text-primary mb-1">
                {primaryIsEquipment ? 'Explain your equipment purchase' : primaryRequest.title}
              </h2>
              <p className="text-sm text-text-secondary mb-3">{primaryRequest.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {primaryIsEquipment ? (
                  <Button size="sm" onClick={() => navigate('/my-return/equipment')}>
                    Provide details
                  </Button>
                ) : primaryDoc ? (
                  <OneClickUpload documentId={primaryDoc.id} documentName={primaryDoc.name} />
                ) : (
                  <Button size="sm" onClick={() => navigate('/my-return/documents')}>
                    Upload document
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : waitingForClient ? (
        <Card padding="lg" className="border-l-4 border-l-warning-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-warning-50 text-warning-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-text-primary mb-1">Your tax preparer needs something from you</h2>
              <p className="text-sm text-text-secondary mb-3">
                Please check your documents and messages for outstanding requests.
              </p>
              <Button size="sm" variant="secondary" onClick={() => navigate('/my-return/messages')}>
                View messages
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="border-l-4 border-l-success-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success-50 text-success-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-text-primary mb-1">No action is currently required from you</h2>
              <p className="text-sm text-text-secondary">
                Your tax preparer will review the information you submitted.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Return progress ──────────────────────────────────────────── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-text-primary">Return progress</h2>
          <Badge variant={taxReturn.stage === 'filed' ? 'success' : 'primary'}>
            {CLIENT_STAGE_LABELS[taxReturn.stage] || taxReturn.stage}
          </Badge>
        </div>
        <ClientProgressTimeline stage={taxReturn.stage} />
        <div className="mt-3">
          <Link to="/my-return/details" className="text-sm text-text-link hover:underline inline-flex items-center gap-1">
            View full progress
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>

      {/* ── Documents + latest message ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-medium text-text-primary">Documents</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Received</span>
              <span className="font-medium text-text-primary">{receivedDocs.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Still needed</span>
              <span className="font-medium text-warning-600">{missingDocs.length}</span>
            </div>
          </div>
          <Link to="/my-return/documents" className="text-xs text-text-link hover:underline mt-3 inline-block">
            View all documents
          </Link>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-medium text-text-primary">Latest message</h3>
          </div>
          {latestMessage ? (
            <div>
              <p className="text-xs text-text-muted mb-1">
                From your tax preparer — {new Date(latestMessage.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-sm text-text-secondary line-clamp-3">{latestMessage.content}</p>
              <Link to="/my-return/messages" className="text-xs text-text-link hover:underline mt-2 inline-block">
                View conversation
              </Link>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No messages yet.</p>
          )}
        </Card>
      </div>

      {/* Deadline */}
      <div className="px-1 text-sm text-text-muted">
        Filing deadline: {new Date(taxReturn.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

function ClientProgressTimeline({ stage }: { stage: string }) {
  const steps = [
    { id: 'info', label: 'Information received' },
    { id: 'prep', label: 'Preparation' },
    { id: 'review', label: 'Review' },
    { id: 'approval', label: 'Your approval' },
    { id: 'filed', label: 'Filing' },
  ]
  const stageToStep: Record<string, number> = {
    collecting_information: 0, waiting_on_client: 0, ready_to_prepare: 1, preparing: 1,
    ready_for_review: 2, under_review: 2, changes_requested: 1, waiting_for_client_approval: 3,
    ready_to_file: 4, filed: 5, filing_rejected: 4,
  }
  const currentStep = stageToStep[stage] ?? 0
  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-success-600" aria-label={`${step.label} — completed`} />
              ) : isCurrent ? (
                <div className="h-5 w-5 rounded-full border-2 border-primary-500 bg-primary-50 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary-500" />
                </div>
              ) : (
                <Circle className="h-5 w-5 text-neutral-300" aria-label={`${step.label} — upcoming`} />
              )}
              <span className="text-[10px] md:text-xs text-text-muted mt-1 text-center max-w-[4.5rem]">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-success-500' : 'bg-neutral-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
