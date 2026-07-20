import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, MessageSquare, ClipboardList, AlertTriangle, Hash } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { cn } from '@/utils/cn'
import { STATUS_LABELS, STATUS_VARIANTS } from '@/services/document-service'
import { filterThreadsForRole } from '@/services/collaboration-service'
import { getFieldsForDocument } from '@/services/traceability-service'
import { computeFieldValue } from '@/services/field-service'
import type { Role } from '@/domain/types'
import { DocPage } from './DocPage'

interface DocumentViewerProps {
  documentId: string
  page: number
  zoom: number
  highlightSection: string | null
  highlightValue?: string | null
  viewerRole: Role
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onSelectField: (fieldId: string, docId: string) => void
  onOpenMessage: (threadId: string) => void
  onOpenIssue: (issueId: string) => void
}

export function DocumentViewer({
  documentId, page, zoom, highlightSection, highlightValue, viewerRole,
  onPageChange, onZoomChange, onSelectField, onOpenMessage, onOpenIssue,
}: DocumentViewerProps) {
  const documents = useDemoStore((s) => s.documents)
  const fields = useDemoStore((s) => s.fields)
  const calculations = useDemoStore((s) => s.calculations)
  const threads = useDemoStore((s) => s.threads)
  const requests = useDemoStore((s) => s.requests)
  const issues = useDemoStore((s) => s.issues)
  const users = useDemoStore((s) => s.users)

  const doc = documents.find((d) => d.id === documentId)
  if (!doc) return <p className="p-4 text-sm text-text-muted">Document not found.</p>

  const pageCount = Math.max(doc.pageCount || 1, 1)
  const relatedFields = getFieldsForDocument(fields, documentId)
  const relatedThreads = filterThreadsForRole(threads, viewerRole).filter((t) => t.linkedDocumentId === documentId)
  const relatedRequests = requests.filter((r) => r.linkedDocumentId === documentId)
  const relatedIssues = issues.filter((i) => i.documentId === documentId)
  const userName = (id: string) => users.find((u) => u.id === id)?.name || 'Unknown'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-text-muted px-1">Page {Math.min(page, pageCount)} of {pageCount}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onZoomChange(zoom - 0.2)} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => onZoomChange(zoom + 0.2)} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document canvas */}
      <div className="border border-border-default rounded-lg bg-neutral-100 overflow-auto p-4 max-h-[26rem]">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}>
          <DocPage
            type={doc.type}
            name={doc.name}
            page={Math.min(page, pageCount)}
            highlightSection={highlightSection}
            highlightValue={highlightValue ?? undefined}
          />
        </div>
      </div>

      {/* Metadata */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary">{doc.name}</p>
          <Badge variant={STATUS_VARIANTS[doc.status] || 'default'}>{STATUS_LABELS[doc.status] || doc.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
          <span>Type: <span className="text-text-secondary">{doc.type}</span></span>
          <span>Pages: <span className="text-text-secondary">{pageCount}</span></span>
          <span>Size: <span className="text-text-secondary">{doc.fileSize}</span></span>
          <span>Uploaded: <span className="text-text-secondary">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}</span></span>
        </div>
      </div>

      {/* Related return fields */}
      <RelatedSection icon={Hash} title={`Return fields (${relatedFields.length})`}>
        {relatedFields.length === 0 ? <Empty /> : relatedFields.map((f) => {
          const live = computeFieldValue(f, fields, calculations)
          return (
            <button key={f.id} onClick={() => onSelectField(f.id, documentId)} className="w-full flex items-center justify-between gap-2 p-2 rounded-md hover:bg-neutral-50 text-left">
              <span className="text-sm text-text-secondary truncate">{f.label}</span>
              <span className="text-sm font-medium text-text-primary shrink-0">{live.formatted}</span>
            </button>
          )
        })}
      </RelatedSection>

      {/* Related messages */}
      <RelatedSection icon={MessageSquare} title={`Messages (${relatedThreads.length})`}>
        {relatedThreads.length === 0 ? <Empty /> : relatedThreads.map((t) => (
          <button key={t.id} onClick={() => onOpenMessage(t.id)} className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-neutral-50 text-left">
            {t.visibility === 'internal_only' && <Badge variant="warning">Internal</Badge>}
            <span className="text-sm text-text-secondary truncate">{t.subject}</span>
          </button>
        ))}
      </RelatedSection>

      {/* Related requests */}
      <RelatedSection icon={ClipboardList} title={`Requests (${relatedRequests.length})`}>
        {relatedRequests.length === 0 ? <Empty /> : relatedRequests.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 p-2">
            <span className="text-sm text-text-secondary truncate">{r.title}</span>
            <span className="text-xs text-text-muted capitalize shrink-0">{r.status}</span>
          </div>
        ))}
      </RelatedSection>

      {/* Related issues */}
      <RelatedSection icon={AlertTriangle} title={`Issues (${relatedIssues.length})`}>
        {relatedIssues.length === 0 ? <Empty /> : relatedIssues.map((i) => (
          <button key={i.id} onClick={() => onOpenIssue(i.id)} className="w-full flex items-center justify-between gap-2 p-2 rounded-md hover:bg-neutral-50 text-left">
            <span className="text-sm text-text-secondary truncate">{i.title}</span>
            <Badge variant={i.priority === 'high' ? 'error' : i.priority === 'medium' ? 'warning' : 'default'}>{i.priority}</Badge>
          </button>
        ))}
      </RelatedSection>

      <p className="text-[11px] text-text-muted">Documents are rendered locally from fabricated data — no files are stored or fetched.</p>
      <span className="hidden">{userName('')}</span>
    </div>
  )
}

function RelatedSection({ icon: Icon, title, children }: { icon: typeof Hash; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border-default rounded-lg">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border-default bg-neutral-50">
        <Icon className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-secondary">{title}</span>
      </div>
      <div className={cn('p-1')}>{children}</div>
    </div>
  )
}

function Empty() {
  return <p className="text-xs text-text-muted px-2 py-1.5">None</p>
}
