import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  side?: 'left' | 'right'
  className?: string
}

export function Drawer({ open, onClose, title, children, side = 'right', className }: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-surface-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'absolute top-0 bottom-0 w-full max-w-md bg-surface-card shadow-lg flex flex-col',
          side === 'right' ? 'right-0' : 'left-0',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 id="drawer-title" className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:bg-neutral-100 hover:text-text-primary"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
