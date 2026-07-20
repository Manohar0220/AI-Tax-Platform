import { useState } from 'react'
import { ArrowRight, GitBranch } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import { Button, Textarea } from '@/components/forms'
import { Modal } from '@/components/feedback/Modal'
import { getValidNextStages, transitionStage, STAGE_META } from '@/services/status-service'
import type { ReturnStage, TaxReturn } from '@/domain/types'

interface StageAdvancerProps {
  taxReturn: TaxReturn
}

/**
 * Staff control to advance a return's stage. Only valid next stages are offered,
 * and each transition requires a reason — invalid jumps are impossible here.
 */
export function StageAdvancer({ taxReturn }: StageAdvancerProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const addToast = useToastStore((s) => s.addToast)
  // Re-read the live return so the control updates after a transition.
  const ret = useDemoStore((s) => s.returns.find((r) => r.id === taxReturn.id)) ?? taxReturn

  const [target, setTarget] = useState<ReturnStage | null>(null)
  const [reason, setReason] = useState('')

  const nextStages = getValidNextStages(ret.stage)

  const confirm = () => {
    if (!target || !currentUser) return
    try {
      transitionStage(ret.id, target, currentUser.id, reason.trim() || 'Stage advanced')
      addToast({ message: `Moved to “${STAGE_META[target].label}”.`, type: 'success' })
    } catch (e) {
      addToast({ message: (e as Error).message, type: 'error' })
    }
    setTarget(null)
    setReason('')
  }

  if (nextStages.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-card p-3 text-sm text-text-muted flex items-center gap-2">
        <GitBranch className="h-4 w-4" /> This return is filed — no further stage changes.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-3">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <GitBranch className="h-3.5 w-3.5" /> Advance stage
      </p>
      <div className="flex flex-wrap gap-2">
        {nextStages.map((s) => (
          <Button key={s} size="sm" variant="secondary" onClick={() => setTarget(s)}>
            {STAGE_META[s].label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Change return stage" size="sm">
        {target && (
          <>
            <p className="text-sm text-text-secondary mb-3">
              Move from <span className="font-medium text-text-primary">{STAGE_META[ret.stage].label}</span> to{' '}
              <span className="font-medium text-text-primary">{STAGE_META[target].label}</span>.
            </p>
            <Textarea
              label="Reason (recorded in history)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. All documents received; ready to prepare."
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>Cancel</Button>
              <Button size="sm" onClick={confirm}>Confirm change</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
