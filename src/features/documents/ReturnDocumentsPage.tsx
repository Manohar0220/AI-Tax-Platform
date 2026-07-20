import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, AlertTriangle, CheckCircle2, Clock, Copy, ImageOff, Upload, Search } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { getChecklistForReturn, isRelevant, isReturnAwaitingOnboarding } from '@/services/checklist-service'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { EmptyState } from '@/components/status'
import {
  categorizeDocument,
  INDIVIDUAL_CATEGORY_LABELS,
  BUSINESS_CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  type DocumentCategory,
} from '@/services/document-service'
import type { Document } from '@/domain/types'

/**
 * Staff-facing Documents tab for a return. Shows every source document for the
 * return (no client-side relevance filtering) grouped by category — the same
 * documents the client sees in their own Documents tab, plus staff detail.
 */
export function ReturnDocumentsPage() {
  const { returnId } = useParams<{ returnId: string }>()
  const navigate = useNavigate()
  const documents = useDemoStore((s) => s.documents)
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const requests = useDemoStore((s) => s.requests)

  const taxReturn = returns.find((r) => r.id === returnId)
  const returnType = taxReturn?.type || 'individual'

  // Show the same documents the client sees — filtered by their onboarding
  // answers — plus any document the preparer has explicitly requested.
  const returnDocs = useMemo(() => {
    if (!returnId) return []
    const checklist = getChecklistForReturn(returnId, clients, returns)
    const requestedDocIds = new Set(
      requests
        .filter((r) => r.returnId === returnId && (r.status === 'pending' || r.status === 'overdue') && r.linkedDocumentId)
        .map((r) => r.linkedDocumentId as string),
    )
    return documents.filter(
      (d) =>
        d.returnId === returnId &&
        (isRelevant(checklist.relevantDocIds, d.id) || requestedDocIds.has(d.id)),
    )
  }, [documents, returnId, clients, returns, requests])

  const categoryLabels = returnType === 'business' ? BUSINESS_CATEGORY_LABELS : INDIVIDUAL_CATEGORY_LABELS
  const categoryOrder: DocumentCategory[] = returnType === 'business'
    ? ['income', 'expenses', 'banking', 'payroll', 'contractors', 'assets', 'legal', 'other']
    : ['income', 'home', 'investments', 'family', 'other']

  const grouped = useMemo(() => {
    const map = new Map<DocumentCategory, Document[]>()
    categoryOrder.forEach((cat) => map.set(cat, []))
    returnDocs.forEach((doc) => {
      const cat = categorizeDocument(doc, returnType)
      const existing = map.get(cat) || []
      existing.push(doc)
      map.set(cat, existing)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnDocs, returnType])

  const receivedCount = returnDocs.filter((d) => d.status !== 'missing').length
  const missingCount = returnDocs.filter((d) => d.status === 'missing').length

  // For the two demo returns, don't show documents until the client has onboarded.
  if (returnId && isReturnAwaitingOnboarding(returnId, clients, returns)) {
    return (
      <EmptyState
        title="Waiting for the client to complete onboarding"
        description="The client's documents will appear here once they submit their information."
        icon={<Clock className="h-12 w-12" />}
      />
    )
  }

  if (returnDocs.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        description="Source documents for this return will appear here as the client uploads them."
        icon={<FileText className="h-12 w-12" />}
      />
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Documents</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {returnDocs.length} total · {receivedCount} received · {missingCount} still needed
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/returns/${returnId}/trace`)}>
          <Search className="h-3.5 w-3.5" /> Open in trace
        </Button>
      </div>

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
                  <DocumentRow key={doc.id} document={doc} onTrace={() => navigate(`/returns/${returnId}/trace`)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DocumentRow({ document: doc, onTrace }: { document: Document; onTrace: () => void }) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <StatusIcon status={doc.status} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={STATUS_VARIANTS[doc.status] || 'default'}>
              {STATUS_LABELS[doc.status] || doc.status}
            </Badge>
            <span className="text-xs text-text-muted">{doc.type}</span>
            {doc.uploadedAt && (
              <span className="text-xs text-text-muted">
                {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {doc.notes && <p className="text-xs text-text-muted mt-1">{doc.notes}</p>}
        </div>
        {doc.status !== 'missing' && (
          <Button variant="ghost" size="sm" onClick={onTrace}>View</Button>
        )}
      </div>
    </Card>
  )
}

function StatusIcon({ status }: { status: string }) {
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
