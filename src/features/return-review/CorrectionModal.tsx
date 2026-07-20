import { useState } from 'react'
import { Modal } from '@/components/feedback/Modal'
import { Button, Textarea } from '@/components/forms'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import { correctField, formatCurrency } from '@/services/field-service'

interface CorrectionModalProps {
  fieldId: string | null
  viewerUserId: string
  onClose: () => void
  onDone?: () => void
}

export function CorrectionModal({ fieldId, viewerUserId, onClose, onDone }: CorrectionModalProps) {
  const fields = useDemoStore((s) => s.fields)
  const addToast = useToastStore((s) => s.addToast)
  const field = fields.find((f) => f.id === fieldId) || null

  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(false)

  // Verified/locked values are never silently overwritten — warn explicitly.
  const isProtected = field?.state === 'verified' || field?.state === 'locked'

  const submit = () => {
    if (!field) return
    if (!reason.trim()) { setReasonError(true); return }
    const num = Number(value)
    if (Number.isNaN(num)) return
    correctField(field.id, num, reason, viewerUserId)
    addToast({ message: 'Value corrected and sent to the reviewer queue.', type: 'success' })
    onDone?.()
    onClose()
  }

  if (!field) return null

  return (
    <Modal open={!!fieldId} onClose={onClose} title={`Correct “${field.label}”`} size="md">
      <p className="text-sm text-text-muted mb-3">
        Current value {formatCurrency(field.value)}
        {field.aiExtractedValue !== undefined && ` · AI extracted ${formatCurrency(field.aiExtractedValue)}`}
      </p>

      {isProtected && (
        <div className="mb-3 rounded-md bg-warning-50 border border-warning-500 p-2.5 text-sm text-warning-700">
          This value has already been {field.state === 'locked' ? 'locked after review' : 'verified'}. Correcting it will
          reopen it for review — it will not be changed silently.
        </div>
      )}

      <label htmlFor="correct-value" className="block text-sm font-medium text-text-secondary mb-1">New value</label>
      <div className="relative mb-3 w-48">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
        <input
          id="correct-value"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full pl-7 pr-3 py-2 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus"
        />
      </div>

      <Textarea
        label="Reason for correction (required)"
        value={reason}
        onChange={(e) => { setReason(e.target.value); setReasonError(false) }}
        error={reasonError ? 'A correction reason is required.' : undefined}
        placeholder="e.g. OCR misread the first digit; verified against the physical W-2."
      />

      <div className="flex justify-end gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={!value.trim()}>Save correction</Button>
      </div>
    </Modal>
  )
}
