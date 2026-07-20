import type {
  TaxReturn, Client, Business, Document, Task, Issue, User, Role,
} from '@/domain/types'
import { getReturnClientName } from '@/features/dashboard/dashboard-utils'

const CLIENT_ROLES: Role[] = ['individual_taxpayer', 'business_owner']

export interface SearchData {
  returns: TaxReturn[]
  clients: Client[]
  businesses: Business[]
  documents: Document[]
  tasks: Task[]
  issues: Issue[]
  users: User[]
}

export interface SearchScope {
  role: Role
  userId: string
}

export interface SearchResultItem {
  id: string
  label: string
  sublabel: string
  to: string
}

export interface GroupedResults {
  clients: SearchResultItem[]
  businesses: SearchResultItem[]
  returns: SearchResultItem[]
  documents: SearchResultItem[]
  tasks: SearchResultItem[]
  issues: SearchResultItem[]
  total: number
}

/** Which return ids the searcher may see, based on their role. */
export function allowedReturnIds(data: SearchData, scope: SearchScope): Set<string> {
  const { role, userId } = scope
  if (CLIENT_ROLES.includes(role)) {
    const client = data.clients.find((c) => c.userId === userId)
    return new Set(data.returns.filter((r) => r.clientId === client?.id).map((r) => r.id))
  }
  // Preparers, reviewers, and admins can search across the firm.
  return new Set(data.returns.map((r) => r.id))
}

function matches(q: string, ...fields: (string | undefined | null)[]): boolean {
  return fields.some((f) => f?.toLowerCase().includes(q))
}

const RESULT_LIMIT_PER_GROUP = 8

/**
 * Global search across clients, businesses, returns, documents, tasks, and issues,
 * grouped by type and scoped to what the searcher is permitted to see.
 */
export function search(query: string, data: SearchData, scope: SearchScope): GroupedResults {
  const q = query.trim().toLowerCase()
  const empty: GroupedResults = { clients: [], businesses: [], returns: [], documents: [], tasks: [], issues: [], total: 0 }
  if (q.length < 2) return empty

  const allowed = allowedReturnIds(data, scope)
  const isClient = CLIENT_ROLES.includes(scope.role)
  const returnBase = isClient ? '/my-return' : '/returns'
  const clientName = (returnId: string) => {
    const r = data.returns.find((x) => x.id === returnId)
    return r ? getReturnClientName(r, data.clients) : returnId
  }

  const results: GroupedResults = { ...empty, clients: [], businesses: [], returns: [], documents: [], tasks: [], issues: [] }

  // Clients & businesses — staff only (clients don't browse other clients).
  if (!isClient) {
    for (const c of data.clients) {
      const hasAllowed = data.returns.some((r) => r.clientId === c.id && allowed.has(r.id))
      if (!hasAllowed) continue
      if (matches(q, c.name, c.businessName, c.id)) {
        const ret = data.returns.find((r) => r.clientId === c.id)
        results.clients.push({ id: c.id, label: c.businessName || c.name, sublabel: c.type === 'business' ? 'Business client' : 'Individual client', to: ret ? `/returns/${ret.id}` : '/clients' })
      }
    }
    for (const b of data.businesses) {
      if (matches(q, b.name, b.ein, b.entityType)) {
        results.businesses.push({ id: b.id, label: b.name, sublabel: `${b.entityType} · ${b.ein}`, to: '/clients' })
      }
    }
  }

  // Returns (by id or client name).
  for (const r of data.returns) {
    if (!allowed.has(r.id)) continue
    if (matches(q, r.id, clientName(r.id), r.type)) {
      results.returns.push({ id: r.id, label: clientName(r.id), sublabel: `${r.id} · ${r.type} · ${r.taxYear}`, to: isClient ? returnBase : `/returns/${r.id}` })
    }
  }

  // Documents.
  for (const d of data.documents) {
    if (!allowed.has(d.returnId)) continue
    if (matches(q, d.name, d.type, d.id)) {
      results.documents.push({ id: d.id, label: d.name, sublabel: `${d.type} · ${clientName(d.returnId)}`, to: isClient ? `${returnBase}/documents` : `/returns/${d.returnId}/documents` })
    }
  }

  // Tasks (staff work).
  if (!isClient) {
    for (const t of data.tasks) {
      if (!allowed.has(t.returnId)) continue
      if (matches(q, t.title, t.description)) {
        results.tasks.push({ id: t.id, label: t.title, sublabel: clientName(t.returnId), to: `/returns/${t.returnId}/tasks` })
      }
    }
    for (const i of data.issues) {
      if (!allowed.has(i.returnId)) continue
      if (matches(q, i.title, i.description)) {
        results.issues.push({ id: i.id, label: i.title, sublabel: clientName(i.returnId), to: `/returns/${i.returnId}/issues` })
      }
    }
  }

  // Cap each group and compute total.
  ;(['clients', 'businesses', 'returns', 'documents', 'tasks', 'issues'] as const).forEach((k) => {
    results[k] = results[k].slice(0, RESULT_LIMIT_PER_GROUP)
  })
  results.total = results.clients.length + results.businesses.length + results.returns.length +
    results.documents.length + results.tasks.length + results.issues.length

  return results
}
