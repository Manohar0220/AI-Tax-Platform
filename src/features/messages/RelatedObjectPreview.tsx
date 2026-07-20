import { FileText, AlertTriangle, Hash } from 'lucide-react'
import { Modal } from '@/components/feedback/Modal'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { useDemoStore } from '@/store/demo-store'
import { STATUS_LABELS, STATUS_VARIANTS } from '@/services/document-service'

export interface RelatedObjectRef {
  documentId?: string
  issueId?: string
  fieldId?: string
}

interface RelatedObjectPreviewProps {
  open: boolean
  onClose: () => void
  target: RelatedObjectRef | null
}

/**
 * Shows the document / issue / field a conversation is about, in a modal layered
 * over the thread. Because it never navigates away, the underlying thread keeps
 * its scroll position and selection — the user returns exactly where they were.
 */
export function RelatedObjectPreview({ open, onClose, target }: RelatedObjectPreviewProps) {
  const documents = useDemoStore((s) => s.documents)
  const issues = useDemoStore((s) => s.issues)
  const fields = useDemoStore((s) => s.fields)

  if (!target) return null

  const doc = target.documentId ? documents.find((d) => d.id === target.documentId) : undefined
  const issue = target.issueId ? issues.find((i) => i.id === target.issueId) : undefined
  const field = target.fieldId ? fields.find((f) => f.id === target.fieldId) : undefined

  const title = doc ? 'Related document' : issue ? 'Related issue' : field ? 'Related return field' : 'Related item'

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {doc && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-neutral-100 text-neutral-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{doc.name}</p>
              <p className="text-xs text-text-muted">{doc.type}</p>
            </div>
            <Badge variant={STATUS_VARIANTS[doc.status] || 'default'} className="ml-auto">
              {STATUS_LABELS[doc.status] || doc.status}
            </Badge>
          </div>
          {doc.notes && (
            <p className="text-sm text-text-secondary bg-neutral-50 rounded-md p-3">{doc.notes}</p>
          )}
        </div>
      )}

      {issue && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-warning-50 text-warning-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{issue.title}</p>
              <p className="text-xs text-text-muted capitalize">{issue.status} — {issue.priority} priority</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary bg-neutral-50 rounded-md p-3">{issue.description}</p>
        </div>
      )}

      {field && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600 shrink-0">
              <Hash className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{field.label}</p>
              <p className="text-xs text-text-muted">Line {field.line}</p>
            </div>
            <span className="ml-auto text-sm font-semibold text-text-primary">{field.formattedValue}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted mt-4 pt-3 border-t border-border-default">
        Close this to return to the conversation right where you left off.
      </p>
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>Back to conversation</Button>
      </div>
    </Modal>
  )
}
