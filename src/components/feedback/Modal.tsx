import { type ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'w-full rounded-lg border border-border-default shadow-lg p-0 backdrop:bg-surface-overlay',
        sizes[size],
        className
      )}
      aria-labelledby="modal-title"
    >
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-text-muted hover:bg-neutral-100 hover:text-text-primary"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  )
}
