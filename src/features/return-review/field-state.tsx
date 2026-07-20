import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  PencilLine,
  ShieldQuestion,
  Lock,
  Calculator,
  FileWarning,
  Pencil,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/feedback/Badge'
import { FIELD_STATE_LABELS, type FieldDisplayState } from '@/services/field-service'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'ai'

interface StateMeta {
  label: string
  icon: LucideIcon
  variant: BadgeVariant
}

export const FIELD_STATE_META: Record<FieldDisplayState, StateMeta> = {
  ai_generated: { label: FIELD_STATE_LABELS.ai_generated, icon: Sparkles, variant: 'ai' },
  needs_verification: { label: FIELD_STATE_LABELS.needs_verification, icon: AlertTriangle, variant: 'warning' },
  verified: { label: FIELD_STATE_LABELS.verified, icon: CheckCircle2, variant: 'success' },
  corrected: { label: FIELD_STATE_LABELS.corrected, icon: PencilLine, variant: 'warning' },
  approval_required: { label: FIELD_STATE_LABELS.approval_required, icon: ShieldQuestion, variant: 'primary' },
  locked: { label: FIELD_STATE_LABELS.locked, icon: Lock, variant: 'default' },
  read_only_calc: { label: FIELD_STATE_LABELS.read_only_calc, icon: Calculator, variant: 'default' },
  missing_source: { label: FIELD_STATE_LABELS.missing_source, icon: FileWarning, variant: 'error' },
  editable: { label: FIELD_STATE_LABELS.editable, icon: Pencil, variant: 'primary' },
}

export function FieldStateBadge({ state, showLabel = true }: { state: FieldDisplayState; showLabel?: boolean }) {
  const meta = FIELD_STATE_META[state]
  const Icon = meta.icon
  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {showLabel && meta.label}
    </Badge>
  )
}
