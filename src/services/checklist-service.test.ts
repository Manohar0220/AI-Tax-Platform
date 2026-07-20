import { describe, it, expect } from 'vitest'
import {
  getRelevantIndividualDocIds,
  getRelevantIndividualRequestIds,
  getRelevantIndividualIssueIds,
  getRelevantBusinessDocIds,
  getRelevantBusinessRequestIds,
  getRelevantBusinessIssueIds,
  buildClientChecklist,
  isRelevant,
} from './checklist-service'
import type { OnboardingAnswers } from '@/store/onboarding-store'

// ─────────────────────────── Individual taxpayer ────────────────────────────

describe('individual checklist — home/mortgage conditional', () => {
  it('hides mortgage doc and request when homeAction is none', () => {
    const answers: OnboardingAnswers = { homeAction: 'none', hasW2Employment: true }
    const docIds = getRelevantIndividualDocIds(answers)
    const reqIds = getRelevantIndividualRequestIds(answers)
    const issueIds = getRelevantIndividualIssueIds(answers)
    expect(docIds.has('doc-homefirst-mortgage')).toBe(false)
    expect(reqIds.has('req-mortgage-statement')).toBe(false)
    expect(issueIds.has('issue-missing-mortgage')).toBe(false)
  })

  it('shows mortgage doc and request when homeAction is refinanced', () => {
    const answers: OnboardingAnswers = { homeAction: 'refinanced' }
    const docIds = getRelevantIndividualDocIds(answers)
    const reqIds = getRelevantIndividualRequestIds(answers)
    const issueIds = getRelevantIndividualIssueIds(answers)
    expect(docIds.has('doc-homefirst-mortgage')).toBe(true)
    expect(reqIds.has('req-mortgage-statement')).toBe(true)
    expect(issueIds.has('issue-missing-mortgage')).toBe(true)
  })

  it('shows mortgage doc and request when homeAction is bought', () => {
    const answers: OnboardingAnswers = { homeAction: 'bought' }
    expect(getRelevantIndividualDocIds(answers).has('doc-homefirst-mortgage')).toBe(true)
    expect(getRelevantIndividualRequestIds(answers).has('req-mortgage-statement')).toBe(true)
  })

  it('shows mortgage doc when homeAction is sold (may have a partial-year 1098)', () => {
    const answers: OnboardingAnswers = { homeAction: 'sold' }
    expect(getRelevantIndividualDocIds(answers).has('doc-homefirst-mortgage')).toBe(true)
    // Request and issue: only for refinanced/bought (still-active mortgage).
    expect(getRelevantIndividualRequestIds(answers).has('req-mortgage-statement')).toBe(false)
  })
})

describe('individual checklist — W-2 and investment conditional', () => {
  it('includes W-2 docs when hasW2Employment is true', () => {
    const ids = getRelevantIndividualDocIds({ hasW2Employment: true })
    expect(ids.has('doc-acme-w2')).toBe(true)
    expect(ids.has('doc-weekend-w2')).toBe(true)
  })

  it('excludes W-2 docs when hasW2Employment is explicitly false', () => {
    const ids = getRelevantIndividualDocIds({ hasW2Employment: false })
    expect(ids.has('doc-acme-w2')).toBe(false)
  })

  it('includes interest docs when hasInvestments is true', () => {
    const ids = getRelevantIndividualDocIds({ hasInvestments: true })
    expect(ids.has('doc-horizon-interest')).toBe(true)
    expect(ids.has('doc-summit-investment')).toBe(true)
  })

  it('excludes investment docs when hasInvestments is explicitly false', () => {
    const ids = getRelevantIndividualDocIds({ hasInvestments: false })
    expect(ids.has('doc-horizon-interest')).toBe(false)
    expect(ids.has('doc-summit-investment')).toBe(false)
  })
})

// ─────────────────────────── Business owner ─────────────────────────────────

describe('business checklist — equipment conditional', () => {
  it('hides equipment doc and request when hasMajorPurchases is false', () => {
    const answers: OnboardingAnswers = { hasMajorPurchases: false }
    const docIds = getRelevantBusinessDocIds(answers)
    const reqIds = getRelevantBusinessRequestIds(answers)
    const issueIds = getRelevantBusinessIssueIds(answers)
    expect(docIds.has('doc-rp-equipment')).toBe(false)
    expect(reqIds.has('req-equipment-statement')).toBe(false)
    expect(issueIds.has('issue-equipment-use')).toBe(false)
  })

  it('shows equipment doc and request when hasMajorPurchases is true', () => {
    const answers: OnboardingAnswers = { hasMajorPurchases: true }
    const docIds = getRelevantBusinessDocIds(answers)
    const reqIds = getRelevantBusinessRequestIds(answers)
    const issueIds = getRelevantBusinessIssueIds(answers)
    expect(docIds.has('doc-rp-equipment')).toBe(true)
    expect(reqIds.has('req-equipment-statement')).toBe(true)
    expect(issueIds.has('issue-equipment-use')).toBe(true)
  })
})

describe('business checklist — payroll and contractors', () => {
  it('shows payroll when hasEmployees is true', () => {
    expect(getRelevantBusinessDocIds({ hasEmployees: true }).has('doc-rp-payroll')).toBe(true)
  })

  it('hides payroll when hasEmployees is false', () => {
    expect(getRelevantBusinessDocIds({ hasEmployees: false }).has('doc-rp-payroll')).toBe(false)
  })

  it('shows contractors when hasContractors is true', () => {
    expect(getRelevantBusinessDocIds({ hasContractors: true }).has('doc-rp-contractors')).toBe(true)
  })
})

// ─────────────────────────── buildClientChecklist ───────────────────────────

describe('buildClientChecklist — wildcard before onboarding', () => {
  it('returns wildcard sets when onboarding is not completed', () => {
    const filter = buildClientChecklist('individual', {}, false)
    expect(isRelevant(filter.relevantDocIds, 'doc-homefirst-mortgage')).toBe(true)
    expect(isRelevant(filter.relevantDocIds, 'anything')).toBe(true)
  })

  it('applies filtering when onboarding is completed', () => {
    const filter = buildClientChecklist('individual', { homeAction: 'none' }, true)
    expect(isRelevant(filter.relevantDocIds, 'doc-homefirst-mortgage')).toBe(false)
    expect(isRelevant(filter.relevantRequestIds, 'req-mortgage-statement')).toBe(false)
  })

  it('applies equipment filter for business onboarding', () => {
    const withEquip = buildClientChecklist('business', { hasMajorPurchases: true }, true)
    const withoutEquip = buildClientChecklist('business', { hasMajorPurchases: false }, true)
    expect(isRelevant(withEquip.relevantDocIds, 'doc-rp-equipment')).toBe(true)
    expect(isRelevant(withoutEquip.relevantDocIds, 'doc-rp-equipment')).toBe(false)
  })
})
