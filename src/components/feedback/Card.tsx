import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const

export function Card({ children, className, padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-card border border-border-default rounded-lg shadow-sm',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('pb-3 border-b border-border-default', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('pt-3', className)}>{children}</div>
}
