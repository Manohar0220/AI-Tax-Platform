import { create } from 'zustand'

export type TraceMode = 'field' | 'document'

interface TraceabilityState {
  returnId: string | null
  mode: TraceMode
  selectedFieldId: string | null
  selectedDocId: string | null
  page: number
  zoom: number
  setMode: (mode: TraceMode) => void
  selectField: (fieldId: string, docId: string | null) => void
  selectDocument: (docId: string) => void
  setPage: (page: number) => void
  setZoom: (zoom: number) => void
  ensureReturn: (returnId: string) => void
}

const STORAGE_KEY = 'ledgerbridge-traceability'
const MIN_ZOOM = 0.6
const MAX_ZOOM = 2

function load(): Partial<TraceabilityState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    /* ignore */
  }
  return {}
}

function persist(s: TraceabilityState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        returnId: s.returnId,
        mode: s.mode,
        selectedFieldId: s.selectedFieldId,
        selectedDocId: s.selectedDocId,
        page: s.page,
        zoom: s.zoom,
      }),
    )
  } catch {
    /* ignore */
  }
}

const initial = load()

export const useTraceabilityStore = create<TraceabilityState>((set, get) => ({
  returnId: initial.returnId ?? null,
  mode: initial.mode ?? 'field',
  selectedFieldId: initial.selectedFieldId ?? null,
  selectedDocId: initial.selectedDocId ?? null,
  page: initial.page ?? 1,
  zoom: initial.zoom ?? 1,

  setMode: (mode) => { set({ mode }); persist(get()) },

  selectField: (fieldId, docId) => {
    set({ mode: 'field', selectedFieldId: fieldId, selectedDocId: docId, page: 1 })
    persist(get())
  },

  selectDocument: (docId) => {
    set({ mode: 'document', selectedDocId: docId, page: 1 })
    persist(get())
  },

  setPage: (page) => { set({ page: Math.max(1, page) }); persist(get()) },

  setZoom: (zoom) => { set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }); persist(get()) },

  ensureReturn: (returnId) => {
    // Reset selection when switching to a different return.
    if (get().returnId !== returnId) {
      set({ returnId, selectedFieldId: null, selectedDocId: null, page: 1, mode: 'field' })
      persist(get())
    }
  },
}))

export const ZOOM_BOUNDS = { MIN_ZOOM, MAX_ZOOM }
