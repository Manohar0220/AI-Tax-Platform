import { useState } from 'react'
import {
  Sparkles, AlertTriangle, Copy, FileWarning, Lightbulb, GitCompareArrows,
  ChevronDown, ChevronUp, Check, PencilLine, X, MessageSquarePlus, ArrowUpRight, ExternalLink, Undo2, HelpCircle,
} from 'lucide-react'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button, Textarea } from '@/components/forms'
import { useToastStore } from '@/store/toast-store'
import { cn } from '@/utils/cn'
import {
  confidenceLabel, confidenceVariant, canUndo,
  acceptRecommendation, dismissRecommendation, escalateRecommendation, askClientAboutRecommendation,
  requestDocumentFromRecommendation, undoRecommendation,
} from '@/services/ai-service'
import type { AIRecommendation, Role } from '@/domain/types'

const TYPE_META: Record<AIRecommendation['type'], { icon: typeof Sparkles; label: string }> = {
  warning: { icon: AlertTriangle, label: 'Warning' },
  anomaly: { icon: GitCompareArrows, label: 'Anomaly' },
  suggestion: { icon: Lightbulb, label: 'Suggestion' },
  missing_item: { icon: FileWarning, label: 'Missing item' },
  duplicate: { icon: Copy, label: 'Possible duplicate' },
  confirmation: { icon: Check, label: 'Confirmation' },
}

const STATUS_META: Record<AIRecommendation['status'], { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'primary' }> = {
  pending: { label: 'Awaiting your decision', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'default' },
  overridden: { label: 'Value corrected', variant: 'primary' },
  escalated: { label: 'Escalated to reviewer', variant: 'primary' },
}

interface AIRecommendationCardProps {
  rec: AIRecommendation
  viewerRole: Role
  viewerUserId: string
  onCorrect?: (rec: AIRecommendation) => void
  onOpenEvidence?: (rec: AIRecommendation) => void
}

export function AIRecommendationCard({ rec, viewerRole, viewerUserId, onCorrect, onOpenEvidence }: AIRecommendationCardProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [expanded, setExpanded] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [dismissReason, setDismissReason] = useState('')
  const [dismissError, setDismissError] = useState(false)

  const meta = TYPE_META[rec.type]
  const Icon = meta.icon
  const statusMeta = STATUS_META[rec.status]
  const isStaff = viewerRole === 'tax_preparer' || viewerRole === 'reviewer' || viewerRole === 'firm_administrator'
  const isPending = rec.status === 'pending'

  const handleAccept = () => {
    acceptRecommendation(rec.id, viewerUserId)
    addToast({ message: 'Recommendation accepted.', type: 'success' })
  }
  const submitDismiss = () => {
    if (!dismissReason.trim()) { setDismissError(true); return }
    dismissRecommendation(rec.id, dismissReason, viewerUserId)
    setDismissing(false)
    setDismissReason('')
    addToast({ message: 'Recommendation dismissed.', type: 'info' })
  }
  const handleEscalate = () => {
    escalateRecommendation(rec.id, viewerUserId)
    addToast({ message: 'Escalated to the reviewer.', type: 'success' })
  }
  const handleAsk = () => {
    askClientAboutRecommendation(rec.id, viewerUserId)
    addToast({ message: 'A question was sent to the client.', type: 'success' })
  }
  const handleRequestDocument = () => {
    requestDocumentFromRecommendation(rec.id, viewerUserId)
    addToast({ message: 'Document requested from the client.', type: 'success' })
  }
  const handleUndo = () => {
    undoRecommendation(rec.id, viewerUserId)
    addToast({ message: 'Action undone.', type: 'info' })
  }

  return (
    <Card padding="md" className="border-l-4 border-l-ai-500">
      {/* Header: what the AI found + certainty */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-ai-50 text-ai-600 shrink-0">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="ai"><Sparkles className="h-3 w-3" /> AI · {meta.label}</Badge>
              <Badge variant={confidenceVariant(rec.confidence)}>{confidenceLabel(rec.confidence)}</Badge>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mt-1.5">{rec.title}</h3>
          </div>
        </div>
        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
      </div>

      {/* Why it matters */}
      <p className="text-sm text-text-secondary mt-2">{rec.description}</p>

      {/* What is uncertain */}
      {rec.uncertainty && (
        <div className="mt-2 flex items-start gap-1.5 text-sm text-text-secondary">
          <HelpCircle className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
          <span><span className="font-medium text-text-primary">What's uncertain:</span> {rec.uncertainty}</span>
        </div>
      )}

      {/* Recommended action */}
      <div className="mt-2 rounded-md bg-neutral-50 p-2.5">
        <p className="text-xs text-text-muted">Recommended action</p>
        <p className="text-sm text-text-primary">{rec.suggestedAction}</p>
      </div>

      {/* Evidence (expandable, exact % lives here) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-sm text-text-link hover:underline"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? 'Hide details' : 'Show evidence & details'}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 text-sm border-t border-border-default pt-2">
          <div>
            <p className="text-xs text-text-muted">Evidence</p>
            <p className="text-text-secondary">{rec.evidence}</p>
          </div>
          {rec.alternativeActions && rec.alternativeActions.length > 0 && (
            <div>
              <p className="text-xs text-text-muted">Alternative actions</p>
              <ul className="list-disc list-inside text-text-secondary">
                {rec.alternativeActions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-text-muted">Model certainty score: {rec.confidenceScore}% (shown for transparency; use the plain-language label above to decide).</p>
          {onOpenEvidence && (rec.fieldId || rec.documentId) && (
            <button onClick={() => onOpenEvidence(rec)} className="inline-flex items-center gap-1 text-sm text-text-link hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> Open supporting evidence
            </button>
          )}
        </div>
      )}

      {/* Dismissal reason (after dismissed) */}
      {rec.status === 'dismissed' && rec.dismissReason && (
        <p className="mt-2 text-sm text-text-muted">Dismissed: {rec.dismissReason}</p>
      )}

      {/* Actions */}
      {isStaff && (
        <div className="mt-3 pt-3 border-t border-border-default">
          {dismissing ? (
            <div>
              <Textarea
                label="Reason for dismissing (required)"
                value={dismissReason}
                onChange={(e) => { setDismissReason(e.target.value); setDismissError(false) }}
                error={dismissError ? 'A reason is required to dismiss.' : undefined}
                placeholder="e.g. Confirmed correct with the client; no action needed."
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => setDismissing(false)}>Cancel</Button>
                <Button size="sm" onClick={submitDismiss}>Dismiss recommendation</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {isPending && (
                <>
                  {rec.type === 'missing_item' ? (
                    <Button size="sm" onClick={handleRequestDocument}><FileWarning className="h-3.5 w-3.5" /> Request document</Button>
                  ) : (
                    <Button size="sm" onClick={handleAccept}><Check className="h-3.5 w-3.5" /> Accept</Button>
                  )}
                  {rec.fieldId && onCorrect && (
                    <Button size="sm" variant="secondary" onClick={() => onCorrect(rec)}><PencilLine className="h-3.5 w-3.5" /> Correct value</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDismissing(true)}><X className="h-3.5 w-3.5" /> Dismiss</Button>
                  <Button size="sm" variant="ghost" onClick={handleAsk}><MessageSquarePlus className="h-3.5 w-3.5" /> Ask client</Button>
                  <Button size="sm" variant="ghost" onClick={handleEscalate}><ArrowUpRight className="h-3.5 w-3.5" /> Escalate</Button>
                </>
              )}
              {canUndo(rec) && (
                <Button size="sm" variant="ghost" onClick={handleUndo}><Undo2 className="h-3.5 w-3.5" /> Undo</Button>
              )}
            </div>
          )}
        </div>
      )}

      <span className={cn('hidden')} aria-hidden />
    </Card>
  )
}
