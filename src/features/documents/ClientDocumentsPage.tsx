import { useState } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle2, Clock, Copy, ImageOff } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { EmptyState } from '@/components/status'
import { useToastStore } from '@/store/toast-store'
import {
  categorizeDocument,
  INDIVIDUAL_CATEGORY_LABELS,
  BUSINESS_CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  getDocumentAction,
  type DocumentCategory,
} from '@/services/document-service'
import { buildClientChecklist, isRelevant } from '@/services/checklist-service'
import { UploadModal } from './UploadModal'
import { DuplicateModal } from './DuplicateModal'
import type { Document } from '@/domain/types'

export function ClientDocumentsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const clients = useDemoStore((s) => s.clients)
  const returns = useDemoStore((s) => s.returns)
  const documents = useDemoStore((s) => s.documents)
  const requests = useDemoStore((s) => s.requests)
  const addToast = useToastStore((s) => s.addToast)
  const { answers, completed: onboardingCompleted } = useOnboardingStore()

  const [uploadTarget, setUploadTarget] = useState<{ id: string; name: string } | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<{ id: string; name: string } | null>(null)

  const client = clients.find((c) => c.userId === currentUser?.id)
  const taxReturn = returns.find((r) => r.clientId === client?.id)
  const returnType = taxReturn?.type || 'individual'

  // Build the checklist filter from onboarding answers.
  const checklist = buildClientChecklist(returnType, answers, onboardingCompleted)

  // Every pending request the preparer created is real and must always show,
  // regardless of the onboarding-answer relevance filter.
  const pendingRequests = requests
    .filter((r) => r.clientId === client?.id && (r.status === 'pending' || r.status === 'overdue'))

  // A "missing" document is only shown once the preparer has requested it.
  const requestedDocIds = new Set(pendingRequests.map((r) => r.linkedDocumentId).filter(Boolean) as string[])
  const returnDocs = documents
    .filter((d) => d.returnId === taxReturn?.id)
    // Show if relevant to the onboarding answers OR explicitly requested by the preparer.
    .filter((d) => isRelevant(checklist.relevantDocIds, d.id) || requestedDocIds.has(d.id))
    .filter((d) => d.status !== 'missing' || requestedDocIds.has(d.id))

  const categoryLabels = returnType === 'business' ? BUSINESS_CATEGORY_LABELS : INDIVIDUAL_CATEGORY_LABELS
  const categoryOrder: DocumentCategory[] = returnType === 'business'
    ? ['income', 'expenses', 'banking', 'payroll', 'contractors', 'assets', 'legal', 'other']
    : ['income', 'home', 'investments', 'family', 'other']

  const grouped = new Map<DocumentCategory, Document[]>()
  categoryOrder.forEach((cat) => grouped.set(cat, []))
  returnDocs.forEach((doc) => {
    const cat = categorizeDocument(doc, returnType)
    const existing = grouped.get(cat) || []
    existing.push(doc)
    grouped.set(cat, existing)
  })

  const handleUploadSuccess = () => {
    addToast({ message: 'Document uploaded successfully. Your preparer will review it.', type: 'success' })
    setUploadTarget(null)
  }

  const handleAction = (doc: Document) => {
    const action = getDocumentAction(doc)
    if (!action) return

    if (action.type === 'upload' || action.type === 'replace') {
      setUploadTarget({ id: doc.id, name: doc.name })
    } else if (action.type === 'resolve') {
      setDuplicateTarget({ id: doc.id, name: doc.name })
    }
  }

  if (returnDocs.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <EmptyState
          title="No documents yet"
          description="Your tax preparer will let you know when documents are needed."
          icon={<FileText className="h-12 w-12" />}
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Documents</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {returnDocs.length} documents — {returnDocs.filter((d) => d.status === 'missing').length} still needed
          </p>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <Card padding="sm" className="mb-4 border-l-4 border-l-warning-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-600 shrink-0" />
            <p className="text-sm text-text-primary">
              {pendingRequests.length} document{pendingRequests.length > 1 ? 's' : ''} still needed from you
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {categoryOrder.map((cat) => {
          const docs = grouped.get(cat)
          if (!docs || docs.length === 0) return null

          return (
            <div key={cat}>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
                {categoryLabels[cat]}
              </h2>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} onAction={() => handleAction(doc)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {uploadTarget && (
        <UploadModal
          open={true}
          onClose={() => setUploadTarget(null)}
          documentId={uploadTarget.id}
          documentName={uploadTarget.name}
          onSuccess={handleUploadSuccess}
        />
      )}

      {duplicateTarget && (
        <DuplicateModal
          open={true}
          onClose={() => setDuplicateTarget(null)}
          documentId={duplicateTarget.id}
          documentName={duplicateTarget.name}
        />
      )}
    </div>
  )
}

function DocumentCard({ document: doc, onAction }: { document: Document; onAction: () => void }) {
  const action = getDocumentAction(doc)
  const StatusIcon = getStatusIcon(doc.status)

  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <StatusIcon doc={doc} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={STATUS_VARIANTS[doc.status] || 'default'}>
              {STATUS_LABELS[doc.status] || doc.status}
            </Badge>
            {doc.uploadedAt && (
              <span className="text-xs text-text-muted">
                {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        {action && (
          <Button
            variant={action.type === 'upload' || action.type === 'replace' ? 'primary' : 'secondary'}
            size="sm"
            onClick={onAction}
          >
            {action.type === 'upload' && <Upload className="h-3.5 w-3.5" />}
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  )
}

function getStatusIcon(status: string) {
  return function StatusIconComponent({ doc }: { doc: Document }) {
    void doc
    switch (status) {
      case 'missing':
        return <div className="h-9 w-9 rounded-lg bg-warning-50 flex items-center justify-center"><Upload className="h-4.5 w-4.5 text-warning-600" /></div>
      case 'verified':
        return <div className="h-9 w-9 rounded-lg bg-success-50 flex items-center justify-center"><CheckCircle2 className="h-4.5 w-4.5 text-success-600" /></div>
      case 'needs_review':
        return <div className="h-9 w-9 rounded-lg bg-warning-50 flex items-center justify-center"><AlertTriangle className="h-4.5 w-4.5 text-warning-600" /></div>
      case 'needs_replacement':
        return <div className="h-9 w-9 rounded-lg bg-error-50 flex items-center justify-center"><ImageOff className="h-4.5 w-4.5 text-error-600" /></div>
      case 'duplicate_warning':
        return <div className="h-9 w-9 rounded-lg bg-warning-50 flex items-center justify-center"><Copy className="h-4.5 w-4.5 text-warning-600" /></div>
      case 'processing':
        return <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center"><Clock className="h-4.5 w-4.5 text-primary-600" /></div>
      default:
        return <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center"><FileText className="h-4.5 w-4.5 text-neutral-500" /></div>
    }
  }
}
