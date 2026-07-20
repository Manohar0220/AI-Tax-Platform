import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users, Building2, FileText, FolderOpen, CheckSquare, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { search, type GroupedResults, type SearchResultItem } from '@/services/search-service'

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

const GROUPS: { key: keyof Omit<GroupedResults, 'total'>; label: string; icon: typeof Users }[] = [
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'businesses', label: 'Businesses', icon: Building2 },
  { key: 'returns', label: 'Returns', icon: FileText },
  { key: 'documents', label: 'Documents', icon: FolderOpen },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'issues', label: 'Issues', icon: AlertTriangle },
]

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate()
  const activeRole = useAuthStore((s) => s.activeRole)
  const currentUser = useAuthStore((s) => s.currentUser)
  const store = useDemoStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    if (!activeRole || !currentUser) return null
    return search(query, {
      returns: store.returns, clients: store.clients, businesses: store.businesses,
      documents: store.documents, tasks: store.tasks, issues: store.issues, users: store.users,
    }, { role: activeRole, userId: currentUser.id })
  }, [query, activeRole, currentUser, store])

  if (!open) return null

  const go = (item: SearchResultItem) => {
    navigate(item.to)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true" aria-label="Global search">
      <div className="absolute inset-0 bg-surface-overlay" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xl bg-surface-card rounded-lg shadow-lg border border-border-default overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-border-default">
          <Search className="h-4 w-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, returns, documents, tasks…"
            className="flex-1 py-3 text-sm bg-transparent focus:outline-none"
            aria-label="Search"
          />
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-neutral-100" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">Type at least 2 characters to search.</p>
          ) : results && results.total === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">No results for “{query}”.</p>
          ) : (
            GROUPS.map(({ key, label, icon: Icon }) => {
              const items = results?.[key] ?? []
              if (items.length === 0) return null
              return (
                <div key={key} className="py-1">
                  <p className="px-4 py-1 text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </p>
                  {items.map((item) => (
                    <button key={item.id} onClick={() => go(item)} className="w-full text-left px-4 py-2 hover:bg-neutral-50 flex items-center justify-between gap-3">
                      <span className="text-sm text-text-primary truncate">{item.label}</span>
                      <span className="text-xs text-text-muted truncate shrink-0 max-w-[50%]">{item.sublabel}</span>
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-border-default text-xs text-text-muted">
          Results are limited to what your role can access.
        </div>
      </div>
    </div>
  )
}
