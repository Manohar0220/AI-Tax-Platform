import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ToastProps {
  id: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onDismiss: (id: string) => void
  duration?: number
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const

const styles = {
  success: 'border-success-500 bg-success-50',
  error: 'border-error-500 bg-error-50',
  warning: 'border-warning-500 bg-warning-50',
  info: 'border-primary-500 bg-primary-50',
} as const

export function Toast({ id, message, type = 'info', onDismiss, duration = 4000 }: ToastProps) {
  const Icon = icons[type]

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-md bg-surface-card',
        styles[type]
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm text-text-primary flex-1">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="p-1 rounded text-text-muted hover:text-text-primary"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastProps[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
