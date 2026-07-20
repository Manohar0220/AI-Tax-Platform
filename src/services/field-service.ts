import type { ReturnField, Calculation, AuditEvent } from '@/domain/types'
import { useDemoStore } from '@/store/demo-store'

/** Canonical display states used consistently across every staff-facing page. */
export type FieldDisplayState =
  | 'ai_generated'
  | 'needs_verification'
  | 'verified'
  | 'corrected'
  | 'approval_required'
  | 'locked'
  | 'read_only_calc'
  | 'missing_source'
  | 'editable'

export const FIELD_STATE_LABELS: Record<FieldDisplayState, string> = {
  ai_generated: 'AI-generated',
  needs_verification: 'Needs verification',
  verified: 'Verified',
  corrected: 'Manually corrected — review required',
  approval_required: 'Approval required',
  locked: 'Locked',
  read_only_calc: 'Read-only calculation',
  missing_source: 'Missing source',
  editable: 'Editable',
}

/**
 * Resolve a return field to one canonical display state. Derived from the stored
 * state plus the field's other properties, so we get all eight states the design
 * calls for without exploding the domain union.
 */
export function resolveFieldDisplayState(field: ReturnField): FieldDisplayState {
  if (field.state === 'override') return 'corrected'
  if (field.calculation) return 'read_only_calc'
  if (field.sources.length === 0 && (field.value === null || field.value === undefined)) {
    return 'missing_source'
  }
  if (field.state === 'locked') return 'locked'
  if (field.state === 'needs_approval') return 'approval_required'
  if (field.state === 'verified') return 'verified'
  if (field.state === 'ai_extracted') {
    return field.confidence === 'low' ? 'needs_verification' : 'ai_generated'
  }
  if (field.state === 'editable') return 'editable'
  return 'ai_generated'
}

/** A field that a preparer can directly correct. */
export function isCorrectable(field: ReturnField): boolean {
  const s = resolveFieldDisplayState(field)
  return s === 'ai_generated' || s === 'needs_verification' || s === 'editable' || s === 'approval_required' || s === 'corrected'
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return String(value)
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/**
 * Compute a field's live value. Calculated fields sum their Calculation inputs
 * using the current values of the referenced fields (resolved recursively), so
 * totals stay correct after a correction. Returns { value, formatted }.
 */
export function computeFieldValue(
  field: ReturnField,
  allFields: ReturnField[],
  calculations: Calculation[],
  seen: Set<string> = new Set(),
): { value: number | string | null; formatted: string } {
  const calc = calculations.find((c) => c.fieldId === field.id)
  if (!calc || seen.has(field.id)) {
    return { value: field.value, formatted: field.formattedValue }
  }
  seen.add(field.id)

  let total = 0
  for (const input of calc.inputs) {
    const inputField = allFields.find((f) => f.id === input.fieldId)
    if (!inputField) {
      total += input.value
      continue
    }
    const resolved = computeFieldValue(inputField, allFields, calculations, seen)
    const n = typeof resolved.value === 'number' ? resolved.value : Number(resolved.value)
    total += Number.isNaN(n) ? 0 : n
  }
  return { value: total, formatted: formatCurrency(total) }
}

/** Live-resolved inputs for a calculated field (for the provenance breakdown). */
export function getCalculationBreakdown(
  field: ReturnField,
  allFields: ReturnField[],
  calculations: Calculation[],
): { formula: string; inputs: { label: string; value: string }[]; result: string } | null {
  const calc = calculations.find((c) => c.fieldId === field.id)
  if (!calc) return null
  const inputs = calc.inputs.map((input) => {
    const f = allFields.find((ff) => ff.id === input.fieldId)
    const resolved = f ? computeFieldValue(f, allFields, calculations) : { value: input.value }
    return { label: input.label, value: formatCurrency(resolved.value) }
  })
  const result = computeFieldValue(field, allFields, calculations)
  return { formula: calc.formula, inputs, result: result.formatted }
}

function pushAudit(returnId: string, userId: string, action: string, target: string, details: string) {
  const state = useDemoStore.getState()
  const event: AuditEvent = {
    id: `audit-${action}-${Date.now()}`,
    returnId,
    userId,
    action,
    target,
    details,
    timestamp: new Date().toISOString(),
  }
  state.updateState({ auditEvents: [...state.auditEvents, event] })
}

/**
 * Correct a field's value. Requires a reason. Records the AI value, sets the
 * state to a "manually corrected — review required" state, writes an audit event,
 * and marks any linked AI recommendation as overridden. The corrected field then
 * surfaces in the reviewer queue (see getFieldsNeedingReview).
 */
export function correctField(fieldId: string, newValue: number, reason: string, byUserId: string) {
  if (!reason.trim()) throw new Error('A correction reason is required.')
  const state = useDemoStore.getState()
  const target = state.fields.find((f) => f.id === fieldId)
  if (target?.state === 'locked') {
    throw new Error('This field is locked after review. Reopen it for review before changing it.')
  }
  const now = new Date().toISOString()
  let returnId = ''

  const fields = state.fields.map((f) => {
    if (f.id !== fieldId) return f
    returnId = f.returnId
    const aiValue = f.aiExtractedValue ?? f.value ?? undefined
    return {
      ...f,
      value: newValue,
      formattedValue: formatCurrency(newValue),
      state: 'override' as const,
      aiExtractedValue: aiValue,
      correctedValue: newValue,
      correctionReason: reason.trim(),
      correctedBy: byUserId,
      lastChangedBy: byUserId,
      lastChangedAt: now,
    }
  })

  // Mark any linked AI recommendation as overridden.
  const recommendations = state.recommendations.map((r) =>
    r.fieldId === fieldId && r.status === 'pending' ? { ...r, status: 'overridden' as const } : r,
  )

  state.updateState({ fields, recommendations })
  pushAudit(returnId, byUserId, 'field_corrected', fieldId, `Corrected value to ${formatCurrency(newValue)} — ${reason.trim()}`)
}

/** Mark a field as verified by staff. */
export function verifyField(fieldId: string, byUserId: string) {
  const state = useDemoStore.getState()
  const now = new Date().toISOString()
  let returnId = ''
  const fields = state.fields.map((f) => {
    if (f.id !== fieldId) return f
    returnId = f.returnId
    return { ...f, state: 'verified' as const, verifiedBy: byUserId, verifiedAt: now, lastChangedBy: byUserId, lastChangedAt: now }
  })
  state.updateState({ fields })
  pushAudit(returnId, byUserId, 'field_verified', fieldId, 'Marked field as verified')
}

/** Fields awaiting reviewer attention: manual corrections and approval-required. */
export function getFieldsNeedingReview(fields: ReturnField[]): ReturnField[] {
  return fields.filter((f) => f.state === 'override' || f.state === 'needs_approval')
}
