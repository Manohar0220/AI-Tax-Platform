import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/forms'
import { cn } from '@/utils/cn'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="mb-4 text-error-500">
        <AlertTriangle className="h-12 w-12" aria-hidden="true" />
      </div>
      <h3 className="text-base font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
