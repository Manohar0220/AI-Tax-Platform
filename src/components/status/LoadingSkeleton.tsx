import { cn } from '@/utils/cn'

export interface LoadingSkeletonProps {
  className?: string
  lines?: number
  variant?: 'text' | 'card' | 'avatar'
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-4 bg-neutral-200 rounded animate-pulse', className)}
      aria-hidden="true"
    />
  )
}

export function LoadingSkeleton({ className, lines = 3, variant = 'text' }: LoadingSkeletonProps) {
  if (variant === 'avatar') {
    return (
      <div className={cn('flex items-center gap-3', className)} role="status" aria-label="Loading">
        <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-1/3" />
          <SkeletonLine className="w-1/2" />
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={cn('p-4 border border-border-default rounded-lg space-y-3', className)} role="status" aria-label="Loading">
        <SkeletonLine className="w-2/5 h-5" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-4/5" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === lines - 1 ? 'w-3/5' : 'w-full'} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
}
