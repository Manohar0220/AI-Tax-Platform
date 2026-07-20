import { FileText, MapPin } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { formatCurrency } from '@/services/field-service'
import type { ReturnField, SourceLocation } from '@/domain/types'

interface SourceViewerProps {
  field: ReturnField
  source: SourceLocation | null
}

/**
 * A stylized mock of the source document with the exact page/box highlighted.
 * When the field exposes a `sourceStatedValue`, that is shown as the value legible
 * on the document — the basis for a correction.
 */
export function SourceViewer({ field, source }: SourceViewerProps) {
  const documents = useDemoStore((s) => s.documents)

  if (!source) {
    return (
      <div className="p-6 text-center text-sm text-text-muted">
        Select a source to view the original document.
      </div>
    )
  }

  const doc = documents.find((d) => d.id === source.documentId)
  const statedValue = field.sourceStatedValue
  const aiValue = field.aiExtractedValue ?? field.value
  const mismatch = statedValue !== undefined && Number(aiValue) !== statedValue

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-neutral-100 text-neutral-600">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{doc?.name || 'Source document'}</p>
          <p className="text-xs text-text-muted flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Page {source.page} · {source.section}
          </p>
        </div>
      </div>

      {/* Mock document snippet */}
      <div className="rounded-lg border border-border-default bg-neutral-50 p-4 text-sm">
        <p className="text-xs text-text-muted mb-3">{doc?.type || 'Document'} — Page {source.page}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-text-muted">
            <span>Employer / Payer</span>
            <span>{(doc?.name || '').replace(/ (W-2|Interest Statement|Investment Statement)$/,'')}</span>
          </div>
          {/* Highlighted target box */}
          <div className="flex justify-between items-center rounded-md bg-warning-100 border border-warning-500 px-2 py-1.5">
            <span className="font-medium text-warning-800">{source.section}</span>
            <span className="font-semibold text-warning-800">
              {statedValue !== undefined ? formatCurrency(statedValue) : field.formattedValue}
            </span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Other boxes</span>
            <span>…</span>
          </div>
        </div>
      </div>

      {mismatch && (
        <div className="rounded-md bg-error-50 border border-error-500 p-3 text-sm">
          <p className="font-medium text-error-800">Value mismatch</p>
          <p className="text-error-700 mt-0.5">
            The document shows <span className="font-semibold">{formatCurrency(statedValue!)}</span>, but the AI extracted{' '}
            <span className="font-semibold">{formatCurrency(aiValue)}</span>. A correction is likely needed.
          </p>
        </div>
      )}

      {!mismatch && statedValue !== undefined && (
        <div className="flex items-center gap-2 text-sm text-success-700">
          <Badge variant="success">Matches</Badge>
          Extracted value matches the document.
        </div>
      )}
    </div>
  )
}
