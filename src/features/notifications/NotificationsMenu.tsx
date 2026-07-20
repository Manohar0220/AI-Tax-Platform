import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckSquare, ClipboardList, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'
import { daysBetween, DEMO_TODAY } from '@/services/priority-service'
import { getFieldsNeedingReview } from '@/services/field-service'
import type { Role } from '@/domain/types'

interface Note {
  id: string
  icon: typeof Bell
  text: string
  detail: string
  to: string
  urgent?: boolean
}

function buildNotes(
  role: Role,
  userId: string,
  store: ReturnType<typeof useDemoStore.getState>,
): Note[] {
  const clientName = (returnId: string) => {
    const r = store.returns.find((x) => x.id === returnId)
    return r ? getReturnClientName(r, store.clients) : returnId
  }
  const notes: Note[] = []

  if (role === 'individual_taxpayer' || role === 'business_owner') {
    const client = store.clients.find((c) => c.userId === userId)
    store.requests
      .filter((r) => r.clientId === client?.id && (r.status === 'pending' || r.status === 'overdue'))
      .forEach((r) => notes.push({
        id: r.id, icon: ClipboardList, text: r.title, detail: 'Requested by your tax team',
        to: r.linkedDocumentId ? '/my-return/documents' : '/my-return/messages', urgent: r.status === 'overdue',
      }))
    return notes
  }

  // Staff: open tasks assigned to me.
  store.tasks
    .filter((t) => t.assignedTo === userId && (t.status === 'open' || t.status === 'in_progress'))
    .slice(0, 6)
    .forEach((t) => {
      const overdue = !!t.dueDate && daysBetween(DEMO_TODAY, t.dueDate) < 0
      notes.push({ id: t.id, icon: CheckSquare, text: t.title, detail: clientName(t.returnId), to: `/returns/${t.returnId}`, urgent: overdue || t.priority === 'high' })
    })

  // Reviewers: fields awaiting review.
  if (role === 'reviewer') {
    const reviewFields = getFieldsNeedingReview(store.fields).filter((f) => {
      const r = store.returns.find((x) => x.id === f.returnId)
      return r?.reviewerId === userId
    })
    reviewFields.slice(0, 4).forEach((f) => notes.push({
      id: `rev-${f.id}`, icon: ShieldCheck, text: `Review: ${f.label}`, detail: clientName(f.returnId), to: `/returns/${f.returnId}`, urgent: f.state === 'override',
    }))
  }

  return notes
}

export function NotificationsMenu() {
  const navigate = useNavigate()
  const activeRole = useAuthStore((s) => s.activeRole)
  const currentUser = useAuthStore((s) => s.currentUser)
  const store = useDemoStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [])

  const notes = useMemo(
    () => (activeRole && currentUser ? buildNotes(activeRole, currentUser.id, store) : []),
    [activeRole, currentUser, store],
  )
  const count = notes.length

  const go = (n: Note) => { setOpen(false); navigate(n.to) }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-md text-text-muted hover:bg-neutral-100 relative"
        aria-label={`Notifications${count ? ` (${count})` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-error-500 text-[10px] font-medium text-white flex items-center justify-center" aria-hidden="true">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-surface-card border border-border-default rounded-lg shadow-lg z-50 overflow-hidden" role="menu" aria-label="Notifications">
          <div className="px-3 py-2 border-b border-border-default">
            <p className="text-sm font-medium text-text-primary">Notifications</p>
          </div>
          {count === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">You're all caught up.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {notes.map((n) => {
                const Icon = n.icon
                return (
                  <li key={n.id}>
                    <button role="menuitem" onClick={() => go(n)} className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-start gap-2.5">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.urgent ? 'text-error-600' : 'text-text-muted'}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate flex items-center gap-1">
                          {n.urgent && <AlertTriangle className="h-3 w-3 text-error-600 shrink-0" />}{n.text}
                        </p>
                        <p className="text-xs text-text-muted truncate">{n.detail}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
