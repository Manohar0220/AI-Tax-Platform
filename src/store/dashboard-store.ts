import { create } from 'zustand'
import type { ReturnStage, RiskLevel, ReturnType } from '@/domain/types'

export type ScopeFilter = 'mine' | 'all'
export type DeadlineFilter = 'all' | 'overdue' | 'due_soon' | 'later'
export type BlockedFilter = 'all' | 'blocked' | 'unblocked'
export type SortKey = 'priority' | 'deadline' | 'client'

export interface DashboardFilters {
  scope: ScopeFilter
  stage: ReturnStage | 'all'
  risk: RiskLevel | 'all'
  deadline: DeadlineFilter
  blocked: BlockedFilter
  type: ReturnType | 'all'
  reviewerId: string | 'all'
  search: string
  sort: SortKey
}

export const DEFAULT_FILTERS: DashboardFilters = {
  scope: 'mine',
  stage: 'all',
  risk: 'all',
  deadline: 'all',
  blocked: 'all',
  type: 'all',
  reviewerId: 'all',
  search: '',
  sort: 'priority',
}

interface DashboardState extends DashboardFilters {
  scrollTop: number
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void
  resetFilters: () => void
  setScrollTop: (value: number) => void
}

const STORAGE_KEY = 'ledgerbridge-dashboard'

function load(): DashboardFilters & { scrollTop: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_FILTERS, scrollTop: 0, ...JSON.parse(stored) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_FILTERS, scrollTop: 0 }
}

function persist(state: DashboardFilters & { scrollTop: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  ...load(),

  setFilter: (key, value) => {
    set({ [key]: value } as Partial<DashboardState>)
    persist(snapshot(get()))
  },

  resetFilters: () => {
    set({ ...DEFAULT_FILTERS })
    persist({ ...DEFAULT_FILTERS, scrollTop: get().scrollTop })
  },

  setScrollTop: (value) => {
    set({ scrollTop: value })
    persist(snapshot(get()))
  },
}))

function snapshot(s: DashboardState): DashboardFilters & { scrollTop: number } {
  return {
    scope: s.scope,
    stage: s.stage,
    risk: s.risk,
    deadline: s.deadline,
    blocked: s.blocked,
    type: s.type,
    reviewerId: s.reviewerId,
    search: s.search,
    sort: s.sort,
    scrollTop: s.scrollTop,
  }
}
