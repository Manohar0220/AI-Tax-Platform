import { useState } from 'react'
import { Lock, Eye } from 'lucide-react'
import { Modal } from '@/components/feedback/Modal'
import { Button, Textarea } from '@/components/forms'
import { useToastStore } from '@/store/toast-store'
import { requestChanges } from '@/services/reviewer-service'

interface RequestChangesModalProps {
  open: boolean
  returnId: string
  viewerUserId: string
  target?: { fieldId?: string; documentId?: string; issueId?: string }
  defaultInternalNote?: string
  defaultClientQuestion?: string
  onClose: () => void
}

export function RequestChangesModal({
  open, returnId, viewerUserId, target, defaultInternalNote = '', defaultClientQuestion = '', onClose,
}: RequestChangesModalProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [internalNote, setInternalNote] = useState(defaultInternalNote)
  const [clientQuestion, setClientQuestion] = useState(defaultClientQuestion)
  const [askClient, setAskClient] = useState(true)
  const [error, setError] = useState(false)

  const submit = () => {
    if (!internalNote.trim()) { setError(true); return }
    requestChanges({
      returnId,
      target,
      internalNote,
      clientQuestion: askClient ? clientQuestion : undefined,
      byUserId: viewerUserId,
    })
    addToast({ message: 'Changes requested. Preparer notified; return moved to Changes requested.', type: 'success' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Request changes" size="md">
      <div className="space-y-4">
        {/* Internal note */}
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-warning-700">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Internal — visible to the preparer, hidden from the client</span>
          </div>
          <Textarea
            value={internalNote}
            onChange={(e) => { setInternalNote(e.target.value); setError(false) }}
            error={error ? 'An internal note is required.' : undefined}
            placeholder="Explain to the preparer what needs to change and why."
            aria-label="Internal note to preparer"
          />
        </div>

        {/* Client question */}
        <div>
          <label className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={askClient} onChange={(e) => setAskClient(e.target.checked)} className="accent-primary-600" />
            <span className="text-sm text-text-secondary">Also send the client a simple question</span>
          </label>
          {askClient && (
            <>
              <div className="flex items-center gap-1.5 mb-1 text-text-muted">
                <Eye className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Client-visible — keep it plain, no internal review wording</span>
              </div>
              <Textarea
                value={clientQuestion}
                onChange={(e) => setClientQuestion(e.target.value)}
                placeholder="e.g. Was this equipment used entirely for business?"
                aria-label="Client-facing question"
              />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>Request changes</Button>
        </div>
      </div>
    </Modal>
  )
}
