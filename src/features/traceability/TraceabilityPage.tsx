import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, Hash } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useTraceabilityStore } from '@/store/traceability-store'
import { Drawer } from '@/components/feedback/Drawer'
import { Badge } from '@/components/feedback/Badge'
import { cn } from '@/utils/cn'
import { computeFieldValue, formatCurrency, resolveFieldDisplayState } from '@/services/field-service'
import { getFieldsForDocument } from '@/services/traceability-service'
import { isReturnAwaitingOnboarding } from '@/services/checklist-service'
import { EmptyState } from '@/components/status'
import { Clock } from 'lucide-react'
import { FieldStateBadge } from '@/features/return-review/field-state'
import { TraceabilityPanel } from './TraceabilityPanel'
import { DocumentViewer } from './DocumentViewer'
import type { FieldSection, ReturnField, SourceLocation } from '@/domain/types'

const SECTION_ORDER: FieldSection[] = [
  'employment_income', 'interest_income', 'investment_income', 'deductions', 'childcare', 'payments_withholding',
  'business_income', 'business_expenses', 'business_summary',
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

export function TraceabilityPage() {
  const { returnId } = useParams<{ returnId: string }>()
  const navigate = useNavigate()
  const activeRole = useAuthStore((s) => s.activeRole)
  const allFields = useDemoStore((s) => s.fields)
  const documents = useDemoStore((s) => s.documents)
  const clients = useDemoStore((s) => s.clients)
  const returns = useDemoStore((s) => s.returns)

  const {
    mode, selectedFieldId, selectedDocId, page, zoom,
    setMode, selectField, selectDocument, setPage, setZoom, ensureReturn,
  } = useTraceabilityStore()

  const fields = useMemo(() => allFields.filter((f) => f.returnId === returnId), [allFields, returnId])
  const returnDocs = useMemo(() => documents.filter((d) => d.returnId === returnId), [documents, returnId])

  const [activeSource, setActiveSource] = useState<SourceLocation | null>(null)
  const [viewerDrawerOpen, setViewerDrawerOpen] = useState(false)

  // Bind to this return and seed a default selection.
  useEffect(() => {
    if (returnId) ensureReturn(returnId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId])

  useEffect(() => {
    if (!selectedFieldId && fields.length > 0) {
      const first = fields.find((f) => f.sources.length > 0) ?? fields[0]
      selectField(first.id, first.sources[0]?.documentId ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedFieldId])

  // Some returns (e.g. business returns) have no field-level extractions yet, but
  // their AI evidence is document-based. Fall back to document mode so the
  // supporting documents are still viewable instead of a dead end.
  useEffect(() => {
    if (fields.length === 0 && returnDocs.length > 0) {
      if (mode !== 'document') setMode('document')
      if (!selectedDocId) selectDocument(returnDocs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length, returnDocs.length, selectedDocId])

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null

  // Keep the highlighted source in sync with the current field / document.
  useEffect(() => {
    if (mode === 'field' && selectedField) {
      const match = selectedField.sources.find((s) => s.documentId === selectedDocId) ?? selectedField.sources[0] ?? null
      setActiveSource(match)
    }
  }, [mode, selectedField, selectedDocId])

  const grouped = useMemo(() => {
    const map = new Map<FieldSection, ReturnField[]>()
    SECTION_ORDER.forEach((s) => map.set(s, []))
    fields.forEach((f) => map.get((f.section ?? 'employment_income') as FieldSection)!.push(f))
    return map
  }, [fields])

  const handleSelectField = (f: ReturnField) => {
    const src = f.sources[0] ?? null
    selectField(f.id, src?.documentId ?? null)
    setActiveSource(src)
  }

  const handleOpenSource = (source: SourceLocation) => {
    selectField(selectedFieldId ?? '', source.documentId)
    setActiveSource(source)
    setPage(source.page)
    if (typeof window !== 'undefined' && window.innerWidth < 1280) setViewerDrawerOpen(true)
  }

  const handleSelectDocumentField = (fieldId: string) => {
    const f = fields.find((x) => x.id === fieldId)
    if (f) handleSelectField(f)
  }

  const openMessage = () => navigate(`/returns/${returnId}/messages`)
  const openIssue = () => navigate(`/returns/${returnId}/issues`)

  const viewerDocId = selectedDocId ?? activeSource?.documentId ?? returnDocs[0]?.id ?? null
  const highlightValue = selectedField
    ? selectedField.sourceConflict && activeSource?.section === selectedField.sourceConflict.section
      ? formatCurrency(selectedField.sourceConflict.statedValue)
      : selectedField.sourceStatedValue !== undefined
        ? formatCurrency(selectedField.sourceStatedValue)
        : selectedField.formattedValue
    : null

  const awaitingOnboarding = returnId ? isReturnAwaitingOnboarding(returnId, clients, returns) : false
  if (awaitingOnboarding) {
    return (
      <EmptyState
        title="Waiting for the client to complete onboarding"
        description="Source documents and traceable fields will appear here once the client submits their information."
        icon={<Clock className="h-12 w-12" />}
      />
    )
  }
  if (fields.length === 0 && returnDocs.length === 0) {
    return <p className="text-sm text-text-muted">No traceable documents or fields for this return yet.</p>
  }
  if (!activeRole) return null

  const viewer = viewerDocId ? (
    <DocumentViewer
      documentId={viewerDocId}
      page={page}
      zoom={zoom}
      highlightSection={activeSource?.section ?? null}
      highlightValue={highlightValue}
      viewerRole={activeRole}
      onPageChange={setPage}
      onZoomChange={setZoom}
      onSelectField={(fieldId) => handleSelectDocumentField(fieldId)}
      onOpenMessage={openMessage}
      onOpenIssue={openIssue}
    />
  ) : (
    <p className="text-sm text-text-muted">No document selected.</p>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_22rem] gap-4">
      {/* Left rail: mode + list */}
      <aside className="lg:border-r lg:border-border-default lg:pr-3">
        <div className="inline-flex rounded-md border border-border-default overflow-hidden mb-3 w-full">
          {(['field', 'document'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn('flex-1 px-2 py-1.5 text-xs', mode === m ? 'bg-primary-50 text-primary-700 font-medium' : 'text-text-secondary hover:bg-neutral-50')}
            >
              {m === 'field' ? 'By field' : 'By document'}
            </button>
          ))}
        </div>

        {mode === 'field' ? (
          <nav className="space-y-3">
            {SECTION_ORDER.map((sec) => {
              const secFields = grouped.get(sec) ?? []
              if (secFields.length === 0) return null
              return (
                <div key={sec}>
                  <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">{SECTION_LABELS[sec]}</p>
                  <ul className="space-y-0.5">
                    {secFields.map((f) => (
                      <li key={f.id}>
                        <button
                          onClick={() => handleSelectField(f)}
                          className={cn('w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center justify-between gap-2',
                            selectedFieldId === f.id && mode === 'field' ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-50 text-text-secondary')}
                        >
                          <span className="truncate">{f.label}</span>
                          <FieldStateBadge state={resolveFieldDisplayState(f)} showLabel={false} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </nav>
        ) : (
          <ul className="space-y-0.5">
            {returnDocs.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => selectDocument(d.id)}
                  className={cn('w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2',
                    selectedDocId === d.id && mode === 'document' ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-50 text-text-secondary')}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  <span className="truncate">{d.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Center: panel or document's related fields */}
      <section className="min-w-0">
        {mode === 'field' && selectedField ? (
          <TraceabilityPanel
            key={selectedField.id}
            field={selectedField}
            viewerRole={activeRole}
            onOpenDocument={handleOpenSource}
            onOpenMessage={openMessage}
            onOpenIssue={openIssue}
          />
        ) : mode === 'document' && selectedDocId ? (
          <DocumentFieldList
            documentId={selectedDocId}
            fields={fields}
            onSelectField={handleSelectDocumentField}
          />
        ) : (
          <p className="text-sm text-text-muted">Select a {mode === 'field' ? 'field' : 'document'} to trace.</p>
        )}
      </section>

      {/* Right: document viewer (xl+) */}
      <aside className="hidden xl:block xl:border-l xl:border-border-default xl:pl-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Document</h2>
        {viewer}
      </aside>

      {/* Viewer drawer (below xl) */}
      <Drawer open={viewerDrawerOpen} onClose={() => setViewerDrawerOpen(false)} title="Document">
        {viewer}
      </Drawer>
    </div>
  )
}

function DocumentFieldList({ documentId, fields, onSelectField }: {
  documentId: string
  fields: ReturnField[]
  onSelectField: (id: string) => void
}) {
  const allFields = useDemoStore((s) => s.fields)
  const calculations = useDemoStore((s) => s.calculations)
  const related = getFieldsForDocument(fields, documentId)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Hash className="h-4 w-4 text-text-muted" />
        <h2 className="text-base font-semibold text-text-primary">Fields supported by this document</h2>
        <Badge variant="default">{related.length}</Badge>
      </div>
      {related.length === 0 ? (
        <p className="text-sm text-text-muted">No return fields reference this document.</p>
      ) : (
        <ul className="space-y-2">
          {related.map((f) => {
            const live = computeFieldValue(f, allFields, calculations)
            return (
              <li key={f.id}>
                <button
                  onClick={() => onSelectField(f.id)}
                  className="w-full flex items-center justify-between gap-2 p-3 rounded-lg border border-border-default hover:bg-neutral-50 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{f.label}</p>
                    <p className="text-xs text-text-muted">Line {f.line}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-text-primary">{live.formatted}</span>
                    <FieldStateBadge state={resolveFieldDisplayState(f)} showLabel={false} />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
