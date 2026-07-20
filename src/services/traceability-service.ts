import type { ReturnField } from '@/domain/types'

/** Distinct document ids a field draws from (including a conflicting source). */
export function getDocumentIdsForField(field: ReturnField): string[] {
  const ids = field.sources.map((s) => s.documentId)
  if (field.sourceConflict) ids.push(field.sourceConflict.documentId)
  return [...new Set(ids)]
}

/** Fields supported by a document — the reverse direction of traceability. */
export function getFieldsForDocument(fields: ReturnField[], documentId: string): ReturnField[] {
  return fields.filter(
    (f) =>
      f.sources.some((s) => s.documentId === documentId) ||
      f.sourceConflict?.documentId === documentId,
  )
}

export function isMissingSource(field: ReturnField): boolean {
  return field.sources.length === 0
}

export function hasConflictingSources(field: ReturnField): boolean {
  return !!field.sourceConflict
}

export function isMultiDocument(field: ReturnField): boolean {
  return getDocumentIdsForField(field).length > 1
}
