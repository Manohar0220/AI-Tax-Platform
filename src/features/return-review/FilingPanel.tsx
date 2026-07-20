import { useState } from 'react'
import { ShieldCheck, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { Card } from '@/components/feedback'
import { Button } from '@/components/forms'
import { useAuthStore } from '@/store/auth-store'
import { useToastStore } from '@/store/toast-store'
import { transitionStage } from '@/services/status-service'
import type { TaxReturn } from '@/domain/types'

/** Shown to staff when a return is ready to file: run a simulated final check, then file. */
export function FilingPanel({ taxReturn }: { taxReturn: TaxReturn }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const addToast = useToastStore((s) => s.addToast)
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(false)

  if (taxReturn.stage !== 'ready_to_file') return null

  const runCheck = () => {
    setChecking(true)
    setTimeout(() => { setChecking(false); setChecked(true); addToast({ message: 'Final check passed — no blocking issues found.', type: 'success' }) }, 900)
  }

  const file = () => {
    try {
      transitionStage(taxReturn.id, 'filed', currentUser!.id, 'Filed after passing the final check')
      addToast({ message: 'Return marked as filed.', type: 'success' })
    } catch (e) {
      addToast({ message: (e as Error).message, type: 'error' })
    }
  }

  return (
    <Card padding="md" className="border-l-4 border-l-success-500">
      <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-1">
        <ShieldCheck className="h-4 w-4 text-success-600" /> Ready to file
      </h2>
      <p className="text-sm text-text-muted mb-3">Run a final check, then submit the return (simulated).</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={runCheck} disabled={checking || checked}>
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {checked ? 'Final check passed' : checking ? 'Running…' : 'Run final check'}
        </Button>
        <Button size="sm" onClick={file} disabled={!checked}>
          <Send className="h-3.5 w-3.5" /> Mark as filed
        </Button>
      </div>
    </Card>
  )
}
