import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, PencilLine, ClipboardCheck, Copy, FileUp, AlertTriangle, Check, MessageSquareWarning, CheckCircle2, ExternalLink, Lock,
} from 'lucide-react'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button, Textarea } from '@/components/forms'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import { useTraceabilityStore } from '@/store/traceability-store'
import {
  buildReviewItems, approveField, resolveIssue, approveReturn, addInternalReviewNote, type ReviewItem,
} from '@/services/reviewer-service'
import { getDocumentIdsForField } from '@/services/traceability-service'
import { RequestChangesModal } from './RequestChangesModal'

const ITEM_ICON: Record<ReviewItem['kind'], typeof PencilLine> = {
  correction: PencilLine,
  approval: ClipboardCheck,
  duplicate: Copy,
  received_doc: FileUp,
  warning: AlertTriangle,
}

interface ReviewSummaryPanelProps {
  returnId: string
  viewerUserId: string
}

export function ReviewSummaryPanel({ returnId, viewerUserId }: ReviewSummaryPanelProps) {
  const navigate = useNavigate()
  const returns = useDemoStore((s) => s.returns)
  const fields = useDemoStore((s) => s.fields)
  const documents = useDemoStore((s) => s.documents)
  const issues = useDemoStore((s) => s.issues)
  const users = useDemoStore((s) => s.users)
  const addToast = useToastStore((s) => s.addToast)
  const selectField = useTraceabilityStore((s) => s.selectField)
  const selectDocument = useTraceabilityStore((s) => s.selectDocument)

  const [note, setNote] = useState('')
  const [changeTarget, setChangeTarget] = useState<{ fieldId?: string; documentId?: string; issueId?: string } | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)

  const ret = returns.find((r) => r.id === returnId)
  if (!ret) return null

  const preparer = users.find((u) => u.id === ret.preparerId)
  const items = buildReviewItems(returnId, fields, documents)
  const openIssues = issues.filter((i) => i.returnId === returnId && (i.status === 'open' || i.status === 'in_progress'))
  const alreadyApproved = ret.stage === 'waiting_for_client_approval' || ret.stage === 'ready_to_file' || ret.stage === 'filed'

  const openEvidence = (item: ReviewItem) => {
    if (item.fieldId) {
      const f = fields.find((x) => x.id === item.fieldId)
      selectField(item.fieldId, f ? getDocumentIdsForField(f)[0] ?? null : null)
    } else if (item.documentId) {
      selectDocument(item.documentId)
    }
    navigate(`/returns/${returnId}/trace`)
  }

  const handleApproveItem = (item: ReviewItem) => {
    if (item.fieldId) {
      approveField(item.fieldId, viewerUserId)
      addToast({ message: 'Item approved and locked.', type: 'success' })
    }
  }

  const handleAddNote = () => {
    if (!note.trim()) return
    addInternalReviewNote(returnId, note, viewerUserId)
    setNote('')
    addToast({ message: 'Internal review note added.', type: 'success' })
  }

  const handleApproveReturn = () => {
    approveReturn(returnId, viewerUserId)
    setConfirmApprove(false)
    addToast({ message: 'Return approved. Reviewed fields locked; sent to client for approval.', type: 'success' })
  }

  return (
    <Card padding="md" className="border-l-4 border-l-primary-500">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-primary-600" /> Reviewer summary
        </h2>
        {alreadyApproved && <Badge variant="success">Approved</Badge>}
      </div>
      <p className="text-sm text-text-muted mt-0.5">Prepared by {preparer?.name || '—'}</p>

      {/* Important review items */}
      <div className="mt-3">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Important review items</p>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">No outstanding review items.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const Icon = ITEM_ICON[item.kind]
              const canApprove = item.kind === 'correction' || item.kind === 'approval'
              return (
                <li key={item.id} className="flex items-start gap-2.5 p-2.5 rounded-md border border-border-default">
                  <Icon className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-muted">{item.detail}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <button onClick={() => openEvidence(item)} className="text-xs text-text-link hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Open evidence
                      </button>
                      {canApprove && !alreadyApproved && (
                        <button onClick={() => handleApproveItem(item)} className="text-xs text-success-700 hover:underline inline-flex items-center gap-1">
                          <Check className="h-3 w-3" /> Approve item
                        </button>
                      )}
                      {!alreadyApproved && (
                        <button
                          onClick={() => setChangeTarget({ fieldId: item.fieldId, documentId: item.documentId })}
                          className="text-xs text-warning-700 hover:underline inline-flex items-center gap-1"
                        >
                          <MessageSquareWarning className="h-3 w-3" /> Request change
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Open issues */}
      {openIssues.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Open issues</p>
          <ul className="space-y-1.5">
            {openIssues.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-secondary truncate">{i.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {!alreadyApproved && (
                    <button onClick={() => setChangeTarget({ issueId: i.id, documentId: i.documentId, fieldId: i.fieldId })} className="text-xs text-warning-700 hover:underline">Request change</button>
                  )}
                  <button onClick={() => { resolveIssue(i.id, viewerUserId); addToast({ message: 'Issue resolved.', type: 'success' }) }} className="text-xs text-success-700 hover:underline inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Internal review note */}
      {!alreadyApproved && (
        <div className="mt-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Add internal review note
          </p>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="A note for the preparer / your own record (client cannot see this)." className="min-h-[60px]" />
          <div className="flex justify-end mt-2">
            <Button size="sm" variant="secondary" onClick={handleAddNote} disabled={!note.trim()}>Add note</Button>
          </div>
        </div>
      )}

      {/* Approve whole return */}
      {!alreadyApproved && (
        <div className="mt-4 pt-3 border-t border-border-default flex flex-wrap gap-2">
          <Button onClick={() => setConfirmApprove(true)}>
            <ShieldCheck className="h-4 w-4" /> Approve return
          </Button>
          <Button variant="secondary" onClick={() => setChangeTarget({})}>
            <MessageSquareWarning className="h-4 w-4" /> Request changes
          </Button>
        </div>
      )}

      {changeTarget && (
        <RequestChangesModal
          open
          returnId={returnId}
          viewerUserId={viewerUserId}
          target={changeTarget}
          defaultClientQuestion=""
          onClose={() => setChangeTarget(null)}
        />
      )}

      <ConfirmDialog
        open={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        onConfirm={handleApproveReturn}
        title="Approve this return?"
        message="Reviewed fields (manual corrections and approval-required items) will be locked, and the return will move to the client for approval. Locked fields can't be changed by the preparer without reopening review."
        confirmLabel="Approve return"
      />
    </Card>
  )
}
