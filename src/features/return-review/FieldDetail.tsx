import { useState } from 'react'
import { Sparkles, FileText, PencilLine, CheckCircle2, Calculator, Info, Lock } from 'lucide-react'
import { Card } from '@/components/feedback'
import { Button, Textarea } from '@/components/forms'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import {
  resolveFieldDisplayState,
  isCorrectable,
  computeFieldValue,
  getCalculationBreakdown,
  correctField,
  verifyField,
} from '@/services/field-service'
import { approveField, reopenField } from '@/services/reviewer-service'
import { FieldStateBadge } from './field-state'
import type { ReturnField, SourceLocation, Role } from '@/domain/types'

interface FieldDetailProps {
  field: ReturnField
  viewerRole: Role
  viewerUserId: string
  selectedSource: SourceLocation | null
  onSelectSource: (s: SourceLocation) => void
}

export function FieldDetail({ field, viewerRole, viewerUserId, selectedSource, onSelectSource }: FieldDetailProps) {
  const allFields = useDemoStore((s) => s.fields)
  const calculations = useDemoStore((s) => s.calculations)
  const recommendations = useDemoStore((s) => s.recommendations)
  const documents = useDemoStore((s) => s.documents)
  const users = useDemoStore((s) => s.users)
  const addToast = useToastStore((s) => s.addToast)

  const [correcting, setCorrecting] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(false)

  const displayState = resolveFieldDisplayState(field)
  const live = computeFieldValue(field, allFields, calculations)
  const breakdown = getCalculationBreakdown(field, allFields, calculations)
  const warnings = recommendations.filter((r) => r.fieldId === field.id)
  const canCorrect = viewerRole === 'tax_preparer' && isCorrectable(field)
  const canVerify = (viewerRole === 'tax_preparer' || viewerRole === 'reviewer') &&
    (displayState === 'ai_generated' || displayState === 'needs_verification')

  const userName = (id?: string) => (id === 'ai' ? 'AI extraction' : users.find((u) => u.id === id)?.name || '—')
  const docName = (id: string) => documents.find((d) => d.id === id)?.name || id

  const startCorrection = () => {
    setNewValue(field.sourceStatedValue !== undefined ? String(field.sourceStatedValue) : '')
    setReason('')
    setReasonError(false)
    setCorrecting(true)
  }

  const submitCorrection = () => {
    if (!reason.trim()) {
      setReasonError(true)
      return
    }
    const value = Number(newValue)
    if (Number.isNaN(value)) return
    correctField(field.id, value, reason, viewerUserId)
    setCorrecting(false)
    addToast({ message: 'Value corrected. Sent to the reviewer queue.', type: 'success' })
  }

  const handleVerify = () => {
    verifyField(field.id, viewerUserId)
    addToast({ message: 'Field marked as verified.', type: 'success' })
  }

  const handleApproveLock = () => {
    approveField(field.id, viewerUserId)
    addToast({ message: 'Field approved and locked.', type: 'success' })
  }

  const handleReopen = () => {
    reopenField(field.id, viewerUserId)
    addToast({ message: 'Field reopened for review — you can now edit it.', type: 'info' })
  }

  const canApproveLock = viewerRole === 'reviewer' && (displayState === 'corrected' || displayState === 'approval_required')
  const canReopen = viewerRole === 'tax_preparer' && displayState === 'locked'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-text-muted">Line {field.line}</p>
          <FieldStateBadge state={displayState} />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mt-0.5">{field.label}</h2>
        <p className="text-3xl font-semibold text-text-primary mt-2">{live.formatted}</p>
        {field.state === 'override' && field.aiExtractedValue !== undefined && (
          <p className="text-sm text-text-muted mt-1">
            AI originally extracted {typeof field.aiExtractedValue === 'number' ? `$${field.aiExtractedValue.toLocaleString()}` : field.aiExtractedValue}
          </p>
        )}
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Meta label="Sources" value={`${field.sources.length}`} />
        <Meta label="Warnings" value={`${warnings.length}`} />
        <Meta label="Confidence" value={`${field.confidenceScore}%`} />
        <Meta label="Last changed" value={`${userName(field.lastChangedBy)}${field.lastChangedAt ? ` · ${new Date(field.lastChangedAt).toLocaleDateString()}` : ''}`} />
      </div>

      {/* Correction reason (post-correction) */}
      {field.correctionReason && (
        <div className="rounded-md bg-warning-50 border border-warning-500 p-3 text-sm">
          <p className="font-medium text-warning-800 flex items-center gap-1.5"><PencilLine className="h-4 w-4" /> Manual correction</p>
          <p className="text-warning-700 mt-1">{field.correctionReason}</p>
          <p className="text-xs text-warning-700 mt-1">By {userName(field.correctedBy)} · awaiting reviewer approval</p>
        </div>
      )}

      {/* Calculation breakdown */}
      {breakdown && (
        <Card padding="md">
          <p className="text-sm font-medium text-text-primary flex items-center gap-1.5 mb-2">
            <Calculator className="h-4 w-4 text-text-muted" /> How this is calculated
          </p>
          <div className="space-y-1.5">
            {breakdown.inputs.map((inp, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{inp.label}</span>
                <span className="font-medium text-text-primary">{inp.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm border-t border-border-default pt-1.5 mt-1.5">
              <span className="text-text-muted">{breakdown.formula}</span>
              <span className="font-semibold text-text-primary">= {breakdown.result}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Sources */}
      {field.sources.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Sources</p>
          <div className="space-y-1.5">
            {field.sources.map((s, i) => {
              const active = selectedSource?.documentId === s.documentId && selectedSource?.section === s.section
              return (
                <button
                  key={i}
                  onClick={() => onSelectSource(s)}
                  className={`w-full flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors ${
                    active ? 'border-primary-500 bg-primary-50' : 'border-border-default hover:bg-neutral-50'
                  }`}
                >
                  <FileText className="h-4 w-4 text-text-muted shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-text-secondary">{docName(s.documentId)}</span>
                  <span className="text-xs text-text-muted shrink-0">Pg {s.page} · {s.section}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* AI warnings / explanation */}
      {warnings.map((w) => (
        <div key={w.id} className="rounded-md border border-ai-500/40 bg-ai-50 p-3 text-sm">
          <p className="font-medium text-ai-700 flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> {w.title}</p>
          <p className="text-text-secondary mt-1">{w.description}</p>
          <p className="text-xs text-text-muted mt-1.5 flex items-start gap-1"><Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />{w.evidence}</p>
          <p className="text-xs text-ai-700 mt-1">Suggested: {w.suggestedAction} (confidence {w.confidenceScore}%)</p>
        </div>
      ))}

      {/* Actions */}
      {(canCorrect || canVerify || canApproveLock || canReopen) && !correcting && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border-default">
          {canCorrect && (
            <Button size="sm" onClick={startCorrection}>
              <PencilLine className="h-3.5 w-3.5" /> Correct value
            </Button>
          )}
          {canVerify && (
            <Button size="sm" variant="secondary" onClick={handleVerify}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark verified
            </Button>
          )}
          {canApproveLock && (
            <Button size="sm" onClick={handleApproveLock}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve &amp; lock
            </Button>
          )}
          {canReopen && (
            <Button size="sm" variant="secondary" onClick={handleReopen}>
              <PencilLine className="h-3.5 w-3.5" /> Reopen for review
            </Button>
          )}
        </div>
      )}

      {/* Admin: read-only explanation */}
      {viewerRole === 'firm_administrator' && (
        <div className="pt-2 border-t border-border-default text-xs text-text-muted flex items-start gap-1.5">
          <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Administrators can monitor returns and manage assignments, but cannot edit tax values. Editing is done by the preparer.
        </div>
      )}

      {/* Correction form */}
      {correcting && (
        <Card padding="md" className="border-l-4 border-l-primary-500">
          <p className="text-sm font-medium text-text-primary mb-3">Correct “{field.label}”</p>
          <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="new-value">New value</label>
          <div className="relative mb-3 w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
            <input
              id="new-value"
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
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
            <Button variant="ghost" size="sm" onClick={() => setCorrecting(false)}>Cancel</Button>
            <Button size="sm" onClick={submitCorrection} disabled={!newValue.trim()}>Save correction</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-text-primary">{value}</p>
    </div>
  )
}
