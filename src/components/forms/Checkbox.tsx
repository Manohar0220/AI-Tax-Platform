import { type InputHTMLAttributes, forwardRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-')

    return (
      <label htmlFor={checkboxId} className="inline-flex items-center gap-2 cursor-pointer">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn('peer sr-only', className)}
            {...props}
          />
          <div className="h-4.5 w-4.5 rounded border border-border-default bg-surface-card peer-checked:bg-primary-600 peer-checked:border-primary-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-focus flex items-center justify-center">
            <Check className="h-3 w-3 text-text-inverse opacity-0 peer-checked:opacity-100" />
          </div>
        </div>
        <span className="text-sm text-text-primary">{label}</span>
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
