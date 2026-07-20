import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useTraceabilityStore } from '@/store/traceability-store'
import { EmptyState } from '@/components/status'
import { getDocumentIdsForField } from '@/services/traceability-service'
import { AIRecommendationCard } from './AIRecommendationCard'
import { CorrectionModal } from '@/features/return-review/CorrectionModal'
import type { AIRecommendation } from '@/domain/types'

export function AIReviewPage() {
  const { returnId } = useParams<{ returnId: string }>()
  const navigate = useNavigate()
  const activeRole = useAuthStore((s) => s.activeRole)
  const currentUser = useAuthStore((s) => s.currentUser)
  const recommendations = useDemoStore((s) => s.recommendations)
  const fields = useDemoStore((s) => s.fields)
  const selectField = useTraceabilityStore((s) => s.selectField)
  const selectDocument = useTraceabilityStore((s) => s.selectDocument)

  const [correctFieldId, setCorrectFieldId] = useState<string | null>(null)

  const returnRecs = useMemo(
    () => recommendations.filter((r) => r.returnId === returnId),
    [recommendations, returnId],
  )
  const pending = returnRecs.filter((r) => r.status === 'pending')
  const resolved = returnRecs.filter((r) => r.status !== 'pending')

  if (!activeRole || !currentUser) return null

  const openEvidence = (rec: AIRecommendation) => {
    if (rec.fieldId) {
      const docIds = getDocumentIdsForField(fields.find((f) => f.id === rec.fieldId) ?? { sources: [] } as never)
      selectField(rec.fieldId, rec.documentId ?? docIds[0] ?? null)
    } else if (rec.documentId) {
      selectDocument(rec.documentId)
    }
    navigate(`/returns/${returnId}/trace`)
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-ai-600" /> AI recommendations
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          The AI assists — it never files or finalizes. You decide what to accept, correct, or dismiss.
        </p>
      </div>

      {returnRecs.length === 0 ? (
        <EmptyState title="No AI recommendations" description="The AI has nothing to flag on this return right now." icon={<Sparkles className="h-12 w-12" />} />
      ) : (
        <>
          <section>
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
              Needs your attention ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-text-muted">Nothing pending — all recommendations have been handled.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((rec) => (
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
            )}
          </section>

          {resolved.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
                Handled ({resolved.length})
              </h2>
              <div className="space-y-3">
                {resolved.map((rec) => (
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
        </>
      )}

      <CorrectionModal
        fieldId={correctFieldId}
        viewerUserId={currentUser.id}
        onClose={() => setCorrectFieldId(null)}
      />
    </div>
  )
}
