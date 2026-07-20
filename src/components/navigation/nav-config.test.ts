import { describe, it, expect } from 'vitest'
import { getNavForRole, getAllowedPrefixes } from './nav-config'
import type { Role } from '@/domain/types'

describe('Navigation Config', () => {
  const ALL_ROLES: Role[] = [
    'individual_taxpayer',
    'business_owner',
    'tax_preparer',
    'reviewer',
    'firm_administrator',
  ]

  it('every role has at least one nav item', () => {
    ALL_ROLES.forEach((role) => {
      const items = getNavForRole(role)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  it('every role has allowed prefixes', () => {
    ALL_ROLES.forEach((role) => {
      const prefixes = getAllowedPrefixes(role)
      expect(prefixes.length).toBeGreaterThan(0)
    })
  })

  it('client roles get client navigation', () => {
    const clientNav = getNavForRole('individual_taxpayer')
    expect(clientNav.map((n) => n.id)).toContain('home')
    expect(clientNav.map((n) => n.id)).toContain('documents')
    expect(clientNav.map((n) => n.id)).toContain('messages')
  })

  it('business owner gets business return label', () => {
    const nav = getNavForRole('business_owner')
    expect(nav.some((n) => n.label === 'Business Return')).toBe(true)
  })

  it('preparer gets dashboard and returns', () => {
    const nav = getNavForRole('tax_preparer')
    expect(nav.map((n) => n.id)).toContain('dashboard')
    expect(nav.map((n) => n.id)).toContain('returns')
    expect(nav.map((n) => n.id)).toContain('clients')
    expect(nav.map((n) => n.id)).toContain('tasks')
  })

  it('reviewer gets review queue', () => {
    const nav = getNavForRole('reviewer')
    expect(nav.map((n) => n.id)).toContain('review-queue')
    expect(nav.map((n) => n.id)).toContain('issues')
  })

  it('admin gets firm management items', () => {
    const nav = getNavForRole('firm_administrator')
    expect(nav.map((n) => n.id)).toContain('overview')
    expect(nav.map((n) => n.id)).toContain('team')
    expect(nav.map((n) => n.id)).toContain('assignments')
    expect(nav.map((n) => n.id)).toContain('workload')
    expect(nav.map((n) => n.id)).toContain('deadlines')
  })

  it('client cannot access firm routes', () => {
    const prefixes = getAllowedPrefixes('individual_taxpayer')
    expect(prefixes).not.toContain('/dashboard')
    expect(prefixes).not.toContain('/returns')
    expect(prefixes).not.toContain('/admin')
  })

  it('nav items have valid paths starting with /', () => {
    ALL_ROLES.forEach((role) => {
      const items = getNavForRole(role)
      items.forEach((item) => {
        expect(item.path).toMatch(/^\//)
      })
    })
  })

  it('Maya switching to personal gets client nav', () => {
    const firmNav = getNavForRole('tax_preparer')
    const personalNav = getNavForRole('individual_taxpayer')

    expect(firmNav.map((n) => n.id)).toContain('dashboard')
    expect(personalNav.map((n) => n.id)).toContain('home')
    expect(personalNav.map((n) => n.id)).not.toContain('dashboard')
  })
})
