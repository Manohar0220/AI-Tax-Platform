import { type ReactNode, useState } from 'react'
import { cn } from '@/utils/cn'

export interface Tab {
  id: string
  label: string
  content: ReactNode
}

export interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  return (
    <div className={className}>
      <div className="flex border-b border-border-default" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-neutral-300'
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`tabpanel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={tab.id}
          hidden={activeTab !== tab.id}
          className="pt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
