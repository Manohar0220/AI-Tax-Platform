import { Copy } from 'lucide-react'
import { Modal } from '@/components/feedback/Modal'
import { Button } from '@/components/forms'
import { resolveDuplicate } from '@/services/document-service'

interface DuplicateModalProps {
  open: boolean
  onClose: () => void
  documentId: string
  documentName: string
}

export function DuplicateModal({ open, onClose, documentId, documentName }: DuplicateModalProps) {
  const handleResolve = (resolution: 'same' | 'different' | 'unsure') => {
    resolveDuplicate(documentId, resolution)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Possible duplicate document" size="md">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-lg bg-warning-50 text-warning-600 shrink-0">
          <Copy className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-text-primary font-medium mb-1">
            We found two documents that may contain the same information.
          </p>
          <p className="text-sm text-text-secondary">
            &ldquo;{documentName}&rdquo; looks very similar to another document already on file.
            Help us determine whether these are duplicates.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => handleResolve('same')}
          className="w-full text-left p-3 rounded-lg border border-border-default hover:bg-neutral-50 transition-colors"
        >
          <p className="text-sm font-medium text-text-primary">They are the same document</p>
          <p className="text-xs text-text-muted mt-0.5">
            We will keep the original and mark this one as a duplicate.
          </p>
        </button>

        <button
          onClick={() => handleResolve('different')}
          className="w-full text-left p-3 rounded-lg border border-border-default hover:bg-neutral-50 transition-colors"
        >
          <p className="text-sm font-medium text-text-primary">They are different documents</p>
          <p className="text-xs text-text-muted mt-0.5">
            We will keep both and process them separately.
          </p>
        </button>

        <button
          onClick={() => handleResolve('unsure')}
          className="w-full text-left p-3 rounded-lg border border-border-default hover:bg-neutral-50 transition-colors"
        >
          <p className="text-sm font-medium text-text-primary">I am not sure</p>
          <p className="text-xs text-text-muted mt-0.5">
            Your tax preparer will review and determine the correct action.
          </p>
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  )
}
