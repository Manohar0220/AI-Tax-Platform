import { FileText, MessageSquare, AlertTriangle, ExternalLink, PencilLine, GitCompareArrows, FileWarning } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Card } from '@/components/feedback'
import { Button } from '@/components/forms'
import {
  computeFieldValue,
  getCalculationBreakdown,
  resolveFieldDisplayState,
  formatCurrency,
} from '@/services/field-service'
import { filterThreadsForRole } from '@/services/collaboration-service'
import { getDocumentIdsForField } from '@/services/traceability-service'
import { FieldStateBadge } from '@/features/return-review/field-state'
import type { ReturnField, SourceLocation, Role } from '@/domain/types'

interface TraceabilityPanelProps {
  field: ReturnField
  viewerRole: Role
  onOpenDocument: (source: SourceLocation) => void
  onOpenMessage: (threadId: string) => void
  onOpenIssue: (issueId: string) => void
}

export function TraceabilityPanel({ field, viewerRole, onOpenDocument, onOpenMessage, onOpenIssue }: TraceabilityPanelProps) {
  const allFields = useDemoStore((s) => s.fields)
  const calculations = useDemoStore((s) => s.calculations)
  const documents = useDemoStore((s) => s.documents)
  const threads = useDemoStore((s) => s.threads)
  const issues = useDemoStore((s) => s.issues)
  const users = useDemoStore((s) => s.users)
  const returns = useDemoStore((s) => s.returns)

  const live = computeFieldValue(field, allFields, calculations)
  const breakdown = getCalculationBreakdown(field, allFields, calculations)
  const displayState = resolveFieldDisplayState(field)
  const docIds = getDocumentIdsForField(field)
  const ret = returns.find((r) => r.id === field.returnId)

  const docName = (id: string) => documents.find((d) => d.id === id)?.name || id
  const userName = (id?: string) => (id === 'ai' ? 'AI extraction' : users.find((u) => u.id === id)?.name || '—')

  const relatedThread = filterThreadsForRole(threads, viewerRole).find(
    (t) => t.linkedFieldId === field.id || (t.linkedDocumentId && docIds.includes(t.linkedDocumentId)),
  )
  const relatedIssue = issues.find(
    (i) => i.fieldId === field.id || (i.documentId && docIds.includes(i.documentId)),
  )

  const reviewerName = ret ? userName(ret.reviewerId) : 'Reviewer'
  const isCorrected = field.state === 'override'
  const missingSource = field.sources.length === 0

  return (
    <div className="space-y-3">
      {/* 1. Return field */}
      <div>
        <p className="text-xs text-text-muted">Traceability · Line {field.line}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <h2 className="text-lg font-semibold text-text-primary">{field.label}</h2>
          <FieldStateBadge state={displayState} />
        </div>
      </div>

      {/* 2 & 3. Current + extracted values */}
      <div className="grid grid-cols-2 gap-2">
        <Row label="Current value" value={live.formatted} strong />
        <Row
          label="Original AI value"
          value={field.aiExtractedValue !== undefined ? formatCurrency(field.aiExtractedValue) : '—'}
          muted={!isCorrected}
        />
      </div>

      {/* Missing source edge case */}
      {missingSource ? (
        <div className="flex items-start gap-2 p-3 rounded-md bg-error-50 border border-error-500 text-sm">
          <FileWarning className="h-4 w-4 text-error-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-error-800">Missing source</p>
            <p className="text-error-700">No source document is attached to this field yet.</p>
          </div>
        </div>
      ) : (
        <>
          {/* 4 & 5. Source document + page/section */}
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Source{field.sources.length > 1 ? 's' : ''}</p>
            <div className="space-y-1.5">
              {field.sources.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onOpenDocument(s)}
                  className="w-full flex items-center gap-2 p-2 rounded-md border border-border-default hover:bg-neutral-50 text-left text-sm"
                >
                  <FileText className="h-4 w-4 text-text-muted shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-text-secondary">{docName(s.documentId)}</span>
                  <span className="text-xs text-text-muted shrink-0">Page {s.page} · {s.section}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Conflicting sources edge case */}
      {field.sourceConflict && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-warning-50 border border-warning-500 text-sm">
          <GitCompareArrows className="h-4 w-4 text-warning-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-warning-800">Conflicting sources</p>
            <p className="text-warning-700">{field.sourceConflict.note}</p>
            <button
              onClick={() => onOpenDocument({ documentId: field.sourceConflict!.documentId, page: field.sourceConflict!.page, section: field.sourceConflict!.section })}
              className="text-xs text-text-link hover:underline mt-1 inline-flex items-center gap-1"
            >
              View conflicting page ({formatCurrency(field.sourceConflict.statedValue)})
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Confidence */}
      <Row label="Extraction confidence" value={`${field.confidenceScore}% (${field.confidence})`} />

      {/* 7. Transformation / calculation */}
      {breakdown ? (
        <Card padding="sm">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Transformation</p>
          <div className="space-y-1">
            {breakdown.inputs.map((inp, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-text-secondary">{inp.label}</span>
                <span className="text-text-primary">{inp.value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t border-border-default pt-1 mt-1">
              <span className="text-text-muted">{breakdown.formula}</span>
              <span className="font-semibold text-text-primary">= {breakdown.result}</span>
            </div>
          </div>
        </Card>
      ) : (
        <Row label="Transformation" value="Direct extraction — no calculation applied" />
      )}

      {/* 8. Verification state */}
      <Row
        label="Verification"
        value={
          isCorrected
            ? `${reviewerName} approval required`
            : displayState === 'verified'
              ? `Verified by ${userName(field.verifiedBy)}`
              : displayState === 'locked'
                ? `Locked — reviewed by ${userName(field.verifiedBy)}`
                : FIELD_STATE_TEXT[displayState]
        }
      />

      {/* 9. Correction history */}
      <div>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Correction history</p>
        {isCorrected ? (
          <div className="rounded-md bg-warning-50 border border-warning-500 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-warning-800"><PencilLine className="h-4 w-4" /> Changed by {userName(field.correctedBy)}</p>
            <p className="text-warning-700 mt-1">
              {formatCurrency(field.aiExtractedValue)} → {formatCurrency(field.value)}
            </p>
            {field.correctionReason && <p className="text-warning-700 mt-1">Reason: “{field.correctionReason}”</p>}
            <p className="text-xs text-warning-700 mt-1">{reviewerName} approval required</p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No corrections. Value is as originally extracted.</p>
        )}
      </div>

      {/* Cross-navigation */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border-default">
        {!missingSource && (
          <Button size="sm" variant="secondary" onClick={() => onOpenDocument(field.sources[0])}>
            <FileText className="h-3.5 w-3.5" /> Open document
          </Button>
        )}
        {relatedThread && (
          <Button size="sm" variant="ghost" onClick={() => onOpenMessage(relatedThread.id)}>
            <MessageSquare className="h-3.5 w-3.5" /> Open message
          </Button>
        )}
        {relatedIssue && (
          <Button size="sm" variant="ghost" onClick={() => onOpenIssue(relatedIssue.id)}>
            <AlertTriangle className="h-3.5 w-3.5" /> Open issue
          </Button>
        )}
      </div>
    </div>
  )
}

const FIELD_STATE_TEXT: Record<string, string> = {
  ai_generated: 'AI-generated — awaiting verification',
  needs_verification: 'Needs verification',
  approval_required: 'Approval required',
  editable: 'Editable — no value yet',
  read_only_calc: 'Read-only calculation',
  missing_source: 'Missing source',
  verified: 'Verified',
  locked: 'Locked',
  corrected: 'Manually corrected — review required',
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`${strong ? 'text-base font-semibold' : 'text-sm'} ${muted ? 'text-text-muted' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}
