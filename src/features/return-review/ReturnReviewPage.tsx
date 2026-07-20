import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useTraceabilityStore } from '@/store/traceability-store'
import { Drawer } from '@/components/feedback/Drawer'
import { cn } from '@/utils/cn'
import { computeFieldValue, resolveFieldDisplayState } from '@/services/field-service'
import { getChecklistForReturn, isRelevant, isReturnAwaitingOnboarding } from '@/services/checklist-service'
import { getDocumentIdsForField } from '@/services/traceability-service'
import { EmptyState } from '@/components/status'
import { Clock } from 'lucide-react'
import { FieldStateBadge } from './field-state'
import { FieldDetail } from './FieldDetail'
import { SourceViewer } from './SourceViewer'
import { PreparerActionsPanel } from './PreparerActionsPanel'
import { CorrectionModal } from './CorrectionModal'
import { AIRecommendationCard } from '@/features/ai-review/AIRecommendationCard'
import type { AIRecommendation, FieldSection, ReturnField, SourceLocation } from '@/domain/types'

const SECTION_ORDER: FieldSection[] = [
  'employment_income',
  'interest_income',
  'investment_income',
  'deductions',
  'childcare',
  'payments_withholding',
  'business_income',
  'business_expenses',
  'business_summary',
]

const SECTION_LABELS: Record<FieldSection, string> = {
  employment_income: 'Employment income',
  interest_income: 'Interest income',
  investment_income: 'Investment income',
  deductions: 'Deductions',
  childcare: 'Childcare',
  payments_withholding: 'Payments and withholding',
  business_income: 'Business income',
  business_expenses: 'Business expenses',
  business_summary: 'Business summary',
}

export function ReturnReviewPage() {
  const { returnId } = useParams<{ returnId: string }>()
  const navigate = useNavigate()
  const activeRole = useAuthStore((s) => s.activeRole)
  const currentUser = useAuthStore((s) => s.currentUser)
  const allFields = useDemoStore((s) => s.fields)
  const calculations = useDemoStore((s) => s.calculations)
  const recommendations = useDemoStore((s) => s.recommendations)
  const clients = useDemoStore((s) => s.clients)
  const returns = useDemoStore((s) => s.returns)
  const selectField = useTraceabilityStore((s) => s.selectField)
  const selectDocument = useTraceabilityStore((s) => s.selectDocument)
  const ensureReturn = useTraceabilityStore((s) => s.ensureReturn)

  const [correctFieldId, setCorrectFieldId] = useState<string | null>(null)

  const fields = useMemo(() => allFields.filter((f) => f.returnId === returnId), [allFields, returnId])

  // AI recommendations for this return, relevance-filtered by onboarding answers.
  const returnRecs = useMemo(() => {
    if (!returnId) return []
    const checklist = getChecklistForReturn(returnId, clients, returns)
    return recommendations
      .filter((r) => r.returnId === returnId)
      .filter((r) => isRelevant(checklist.relevantRecIds, r.id))
  }, [recommendations, returnId, clients, returns])
  const pendingRecs = returnRecs.filter((r) => r.status === 'pending')

  const isPreparer = activeRole === 'tax_preparer'

  const openEvidence = (rec: AIRecommendation) => {
    // Bind the trace store to this return first so the selection below isn't
    // reset when the Trace page mounts and calls ensureReturn.
    if (returnId) ensureReturn(returnId)
    if (rec.fieldId) {
      const docIds = getDocumentIdsForField(fields.find((f) => f.id === rec.fieldId) ?? { sources: [] } as never)
      selectField(rec.fieldId, rec.documentId ?? docIds[0] ?? null)
    } else if (rec.documentId) {
      selectDocument(rec.documentId)
    }
    navigate(`/returns/${returnId}/trace`)
  }

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id ?? null)
  const [selectedSource, setSelectedSource] = useState<SourceLocation | null>(fields[0]?.sources[0] ?? null)
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false)

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null

  const grouped = useMemo(() => {
    const map = new Map<FieldSection, ReturnField[]>()
    SECTION_ORDER.forEach((s) => map.set(s, []))
    fields.forEach((f) => {
      const sec = (f.section ?? 'employment_income') as FieldSection
      map.get(sec)!.push(f)
    })
    return map
  }, [fields])

  const handleSelectField = (f: ReturnField) => {
    setSelectedFieldId(f.id)
    setSelectedSource(f.sources[0] ?? null)
  }

  const handleSelectSource = (s: SourceLocation) => {
    setSelectedSource(s)
    if (typeof window !== 'undefined' && window.innerWidth < 1280) setSourceDrawerOpen(true)
  }

  const staff = activeRole === 'tax_preparer' || activeRole === 'reviewer' || activeRole === 'firm_administrator'

  // For the two demo returns, hide all content until the client has onboarded.
  const awaitingOnboarding = returnId ? isReturnAwaitingOnboarding(returnId, clients, returns) : false
  if (awaitingOnboarding) {
    return (
      <div className="max-w-2xl">
        <EmptyState
          title="Waiting for the client to complete onboarding"
          description="This return's extracted fields and AI recommendations will appear here once the client submits their information."
          icon={<Clock className="h-12 w-12" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Manual preparer actions (preparers only) */}
      {isPreparer && currentUser && returnId && (
        <PreparerActionsPanel returnId={returnId} viewerUserId={currentUser.id} />
      )}

      {/* AI recommendations — surfaced inside the Review tab (no separate AI tab) */}
      {staff && currentUser && activeRole && returnRecs.length > 0 && (
        <section className="rounded-lg border border-border-default bg-surface-card p-4">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-ai-600" /> AI recommendations
          </h2>
          <p className="text-xs text-text-muted mb-3">
            The AI assists — it never files or finalizes. You decide what to accept, correct, or dismiss.
            {pendingRecs.length > 0 && ` ${pendingRecs.length} awaiting your decision.`}
          </p>
          <div className="space-y-3">
            {returnRecs.map((rec) => (
              <AIRecommendationCard
                key={rec.id}
                rec={rec}
                viewerRole={activeRole}
                viewerUserId={currentUser.id}
                onCorrect={(r) => setCorrectFieldId(r.fieldId ?? null)}
                onOpenEvidence={openEvidence}
              />
            ))}
          </div>
        </section>
      )}

      {fields.length === 0 ? (
        <p className="text-sm text-text-muted">No return fields to review yet.</p>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_21rem] gap-4">
      {/* Left: sections + fields */}
      <aside className="lg:border-r lg:border-border-default lg:pr-3">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Tax sections</h2>
        <nav className="space-y-4">
          {SECTION_ORDER.map((sec) => {
            const secFields = grouped.get(sec) ?? []
            if (secFields.length === 0) return null
            return (
              <div key={sec}>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">{SECTION_LABELS[sec]}</p>
                <ul className="space-y-1">
                  {secFields.map((f) => {
                    const live = computeFieldValue(f, allFields, calculations)
                    const state = resolveFieldDisplayState(f)
                    const warnCount = recommendations.filter((r) => r.fieldId === f.id).length
                    return (
                      <li key={f.id}>
                        <button
                          onClick={() => handleSelectField(f)}
                          className={cn(
                            'w-full text-left p-2 rounded-md border transition-colors',
                            selectedFieldId === f.id ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:bg-neutral-50',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-text-primary truncate">{f.label}</span>
                            <span className="text-sm font-medium text-text-primary shrink-0">{live.formatted}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <FieldStateBadge state={state} showLabel={false} />
                            <span className="text-[11px] text-text-muted">{f.sources.length} src</span>
                            {warnCount > 0 && <span className="text-[11px] text-warning-600">{warnCount} warning{warnCount > 1 ? 's' : ''}</span>}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Center: field detail */}
      <section className="min-w-0">
        {selectedField && activeRole && currentUser ? (
          <FieldDetail
            key={selectedField.id}
            field={selectedField}
            viewerRole={activeRole}
            viewerUserId={currentUser.id}
            selectedSource={selectedSource}
            onSelectSource={handleSelectSource}
          />
        ) : (
          <p className="text-sm text-text-muted">Select a field to review.</p>
        )}
      </section>

      {/* Right: source viewer (xl and up) */}
      <aside className="hidden xl:block xl:border-l xl:border-border-default xl:pl-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Source document</h2>
        {selectedField && <SourceViewer field={selectedField} source={selectedSource} />}
      </aside>

      {/* Source viewer drawer (below xl) */}
      <Drawer open={sourceDrawerOpen} onClose={() => setSourceDrawerOpen(false)} title="Source document">
        {selectedField && <SourceViewer field={selectedField} source={selectedSource} />}
      </Drawer>
      </div>
      )}

      {currentUser && (
        <CorrectionModal
          fieldId={correctFieldId}
          viewerUserId={currentUser.id}
          onClose={() => setCorrectFieldId(null)}
        />
      )}
    </div>
  )
}
