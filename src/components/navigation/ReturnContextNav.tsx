import { NavLink, useParams } from 'react-router-dom'
import { RETURN_CONTEXT_NAV } from './nav-config'
import { cn } from '@/utils/cn'

export function ReturnContextNav() {
  const { returnId } = useParams<{ returnId: string }>()

  if (!returnId) return null

  return (
    <nav aria-label="Return sections" className="border-b border-border-default bg-surface-card">
      <div className="flex overflow-x-auto px-4">
        {RETURN_CONTEXT_NAV.map((item) => {
          const Icon = item.icon
          const path = item.segment
            ? `/returns/${returnId}/${item.segment}`
            : `/returns/${returnId}`

          return (
            <NavLink
              key={item.id}
              to={path}
              end={!item.segment}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700 font-medium'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-neutral-300'
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
