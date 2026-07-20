import { create } from 'zustand'

/** Small helper to build a persisted "list state" store (filters + paging + scroll). */
function createListStore<T extends Record<string, unknown>>(key: string, defaults: T) {
  interface ListState {
    values: T
    page: number
    scrollTop: number
    selectedId: string | null
    set: <K extends keyof T>(k: K, v: T[K]) => void
    setPage: (p: number) => void
    setScroll: (s: number) => void
    setSelected: (id: string | null) => void
    reset: () => void
  }

  const load = (): { values: T; page: number; scrollTop: number; selectedId: string | null } => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const p = JSON.parse(stored)
        return { values: { ...defaults, ...p.values }, page: p.page ?? 1, scrollTop: p.scrollTop ?? 0, selectedId: p.selectedId ?? null }
      }
    } catch { /* ignore */ }
    return { values: { ...defaults }, page: 1, scrollTop: 0, selectedId: null }
  }

  const persist = (s: { values: T; page: number; scrollTop: number; selectedId: string | null }) => {
    try { localStorage.setItem(key, JSON.stringify(s)) } catch { /* ignore */ }
  }

  const initial = load()

  return create<ListState>((set, get) => ({
    values: initial.values,
    page: initial.page,
    scrollTop: initial.scrollTop,
    selectedId: initial.selectedId,
    set: (k, v) => {
      const values = { ...get().values, [k]: v }
      set({ values, page: 1 }) // reset to first page on filter change
      persist({ values, page: 1, scrollTop: get().scrollTop, selectedId: get().selectedId })
    },
    setPage: (page) => { set({ page }); persist({ values: get().values, page, scrollTop: get().scrollTop, selectedId: get().selectedId }) },
    setScroll: (scrollTop) => { set({ scrollTop }); persist({ values: get().values, page: get().page, scrollTop, selectedId: get().selectedId }) },
    setSelected: (selectedId) => { set({ selectedId }); persist({ values: get().values, page: get().page, scrollTop: get().scrollTop, selectedId }) },
    reset: () => { set({ values: { ...defaults }, page: 1, selectedId: null }); persist({ values: { ...defaults }, page: 1, scrollTop: get().scrollTop, selectedId: null }) },
  }))
}

export const useReturnsListStore = createListStore('ledgerbridge-returns-list', {
  stage: 'all', type: 'all', risk: 'all', deadline: 'all',
  preparer: 'all', reviewer: 'all', blocked: 'all', priority: 'all', search: '', sort: 'deadline',
})

export const useDocsListStore = createListStore('ledgerbridge-docs-list', {
  type: 'All', status: 'all', client: 'all', needsReview: 'no', duplicate: 'no', search: '',
})

export const useTasksListStore = createListStore('ledgerbridge-tasks-list', {
  scope: 'mine', status: 'active', priority: 'all', action: 'all', search: '',
})

export const PAGE_SIZE = 15
