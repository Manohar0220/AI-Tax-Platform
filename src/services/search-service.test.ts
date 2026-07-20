import { describe, it, expect } from 'vitest'
import { search, allowedReturnIds } from './search-service'
import { createSeedState } from '@/data/seed'
import type { SearchData, SearchScope } from './search-service'

function data(): SearchData {
  const s = createSeedState()
  return { returns: s.returns, clients: s.clients, businesses: s.businesses, documents: s.documents, tasks: s.tasks, issues: s.issues, users: s.users }
}

const staff: SearchScope = { role: 'tax_preparer', userId: 'user-maya' }
const client: SearchScope = { role: 'individual_taxpayer', userId: 'user-sarah' }

describe('search-service — grouping and matching', () => {
  it('returns nothing for very short queries', () => {
    expect(search('a', data(), staff).total).toBe(0)
  })

  it('finds a client by name (staff)', () => {
    const r = search('Manohar', data(), staff)
    expect(r.clients.some((c) => c.label.includes('Manohar'))).toBe(true)
  })

  it('finds a return by id', () => {
    const r = search('RET-1001', data(), staff)
    expect(r.returns.some((x) => x.sublabel.includes('RET-1001'))).toBe(true)
  })

  it('finds a document by name', () => {
    const r = search('Acme', data(), staff)
    expect(r.documents.some((d) => d.label.includes('Acme'))).toBe(true)
  })

  it('groups results by type', () => {
    const r = search('equipment', data(), staff)
    // equipment appears in documents/tasks/issues
    expect(r.total).toBeGreaterThan(0)
  })
})

describe('search-service — permissions', () => {
  it('staff can see all returns', () => {
    const d = data()
    const ids = allowedReturnIds(d, staff)
    expect(ids.has('RET-1001')).toBe(true)
    expect(ids.has('RET-2001')).toBe(true)
    expect(ids.size).toBe(d.returns.length)
  })

  it('a client only sees their own return', () => {
    const d = data()
    const ids = allowedReturnIds(d, client)
    expect(ids.has('RET-1001')).toBe(true) // Sarah's
    expect(ids.has('RET-2001')).toBe(false) // Alex's
  })

  it('a client cannot find another client or their documents', () => {
    const r = search('River', data(), client) // Alex's business
    expect(r.total).toBe(0)
    const r2 = search('Alex', data(), client)
    expect(r2.total).toBe(0)
  })

  it('a client does not get the clients/tasks groups', () => {
    const r = search('Manohar', data(), client)
    expect(r.clients.length).toBe(0)
    expect(r.tasks.length).toBe(0)
    // but can find their own return
    expect(r.returns.length).toBeGreaterThanOrEqual(1)
  })
})
