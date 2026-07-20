/**
 * Checklist service — derives which document IDs, request IDs, issue IDs, and
 * AI-recommendation IDs are RELEVANT for a given client based on their
 * onboarding answers.
 *
 * All filtering is done at read-time; no seed data is mutated. Irrelevant
 * records are simply excluded from the views for that return (equivalent to
 * marking them "not applicable"). Staff-facing views for OTHER returns are
 * unaffected — they see everything as before.
 */
import type { OnboardingAnswers } from '@/store/onboarding-store'
import { MANAGED_RETURN_IDS } from '@/services/managed-returns'

/** The two demo returns whose workflow is fully answer-driven and step-by-step. */
export const DEMO_CLIENT_RETURN_IDS = MANAGED_RETURN_IDS

// ─────────────────────────────── Individual taxpayer ─────────────────────────

/** Documents relevant to Manohar (RET-1001) given their onboarding answers. */
export function getRelevantIndividualDocIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>()

  // Always include: prior-year return (reference), ID document, donation receipt.
  ids.add('doc-prior-year-return')
  ids.add('doc-blurry-id')
  ids.add('doc-community-donation')

  // W-2 income.
  if (answers.hasW2Employment !== false) {
    ids.add('doc-acme-w2')
    ids.add('doc-weekend-w2')
  }

  // Bank / investment income.
  if (answers.hasInvestments !== false) {
    ids.add('doc-horizon-interest')
    ids.add('doc-lakeside-interest')
    ids.add('doc-cedar-interest')
    ids.add('doc-summit-investment')
  }

  // Home / mortgage — show for any home activity except 'none'.
  if (answers.homeAction === 'bought' || answers.homeAction === 'refinanced' || answers.homeAction === 'sold') {
    ids.add('doc-homefirst-mortgage')
  }

  // Childcare receipt — only when there are dependants / childcare.
  if (answers.hasChildcare === true || answers.hasDependents === true) {
    ids.add('doc-brightsteps-childcare')
  }

  return ids
}

/** Request IDs that are relevant for Manohar given their answers. */
export function getRelevantIndividualRequestIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>()

  // Mortgage statement only when home activity is a type that creates a 1098.
  if (answers.homeAction === 'bought' || answers.homeAction === 'refinanced') {
    ids.add('req-mortgage-statement')
  }

  return ids
}

/** Issue IDs that are relevant for Manohar given their answers. */
export function getRelevantIndividualIssueIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>()

  // Wage correction issue is relevant when there is W-2 income.
  if (answers.hasW2Employment !== false) {
    ids.add('issue-acme-wage')
  }
  ids.add('issue-blurry-id')

  // Mortgage issue only when home activity implies a 1098.
  if (answers.homeAction === 'bought' || answers.homeAction === 'refinanced') {
    ids.add('issue-missing-mortgage')
  }

  return ids
}

/** AI-recommendation IDs relevant for Manohar given their answers. */
export function getRelevantIndividualRecIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>(['ai-rec-charitable-prior-year'])

  if (answers.hasW2Employment !== false) {
    ids.add('ai-rec-acme-wage-mismatch')
    ids.add('ai-rec-duplicate-w2')
  }
  if (answers.hasInvestments !== false) {
    ids.add('ai-rec-dividend-classification')
    ids.add('ai-rec-conflicting-values')
  }
  if (answers.homeAction === 'bought' || answers.homeAction === 'refinanced') {
    ids.add('ai-rec-missing-mortgage')
  }

  return ids
}

// ─────────────────────────────── Business owner ───────────────────────────────

/** Documents relevant to Alex (RET-2001) given their onboarding answers. */
export function getRelevantBusinessDocIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>()

  // Bank statements always needed for any active business.
  ids.add('doc-rp-bank-q1')
  ids.add('doc-rp-bank-q2')
  ids.add('doc-rp-bank-q3')
  ids.add('doc-rp-bank-q4')

  // Income — P&L and balance sheet.
  if (answers.hasBusinessIncome !== false) {
    ids.add('doc-rp-pnl')
    ids.add('doc-rp-balance')
  }

  // Payroll and contractors (the wizard groups "employees or contractors").
  if (answers.hasEmployees === true || answers.hasContractors === true) {
    ids.add('doc-rp-payroll')
    ids.add('doc-rp-contractors')
  }

  // Equipment invoice.
  if (answers.hasMajorPurchases === true) {
    ids.add('doc-rp-equipment')
  }

  // Lease and insurance (treat as always relevant — most businesses have these).
  ids.add('doc-rp-lease')
  ids.add('doc-rp-insurance')

  return ids
}

/** Request IDs that are relevant for Alex given their answers. */
export function getRelevantBusinessRequestIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>()

  // Equipment use statement only when equipment was purchased.
  if (answers.hasMajorPurchases === true) {
    ids.add('req-equipment-statement')
  }

  return ids
}

/** Issue IDs that are relevant for Alex given their answers. */
export function getRelevantBusinessIssueIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>()

  // Equipment issue only when equipment was purchased.
  if (answers.hasMajorPurchases === true) {
    ids.add('issue-equipment-use')
  }

  return ids
}

/** AI-recommendation IDs relevant for Alex given their answers. */
export function getRelevantBusinessRecIds(answers: OnboardingAnswers): Set<string> {
  const ids = new Set<string>(['ai-rec-bank-duplicate', 'ai-rec-contractor-threshold'])

  if (answers.hasMajorPurchases === true) {
    ids.add('ai-rec-equipment-use')
  }

  return ids
}

// ─────────────────────────────── Unified helpers ─────────────────────────────

export interface ChecklistFilter {
  relevantDocIds: Set<string>
  relevantRequestIds: Set<string>
  relevantIssueIds: Set<string>
  relevantRecIds: Set<string>
}

const WILDCARD: ChecklistFilter = {
  relevantDocIds: new Set(['*']),
  relevantRequestIds: new Set(['*']),
  relevantIssueIds: new Set(['*']),
  relevantRecIds: new Set(['*']),
}

/**
 * Return the combined filter for a given client.
 * When onboarding is not completed, fall back to showing everything
 * (same as before onboarding existed).
 */
export function buildClientChecklist(
  clientType: 'individual' | 'business',
  answers: OnboardingAnswers,
  onboardingCompleted: boolean,
): ChecklistFilter {
  if (!onboardingCompleted) {
    return {
      relevantDocIds: new Set(['*']),
      relevantRequestIds: new Set(['*']),
      relevantIssueIds: new Set(['*']),
      relevantRecIds: new Set(['*']),
    }
  }

  if (clientType === 'individual') {
    return {
      relevantDocIds: getRelevantIndividualDocIds(answers),
      relevantRequestIds: getRelevantIndividualRequestIds(answers),
      relevantIssueIds: getRelevantIndividualIssueIds(answers),
      relevantRecIds: getRelevantIndividualRecIds(answers),
    }
  }
  return {
    relevantDocIds: getRelevantBusinessDocIds(answers),
    relevantRequestIds: getRelevantBusinessRequestIds(answers),
    relevantIssueIds: getRelevantBusinessIssueIds(answers),
    relevantRecIds: getRelevantBusinessRecIds(answers),
  }
}

/** True when a wildcard set ('*') or the ID is explicitly included. */
export function isRelevant(filter: Set<string>, id: string): boolean {
  return filter.has('*') || filter.has(id)
}

// ─────────────────────────── Return-scoped resolution ────────────────────────
//
// Staff (preparer/reviewer/admin) view returns without loading the client's
// onboarding store. These helpers read the client's persisted onboarding answers
// directly so staff-facing screens can apply the same relevance rules — but only
// for the two answer-driven demo returns. All other returns get the wildcard
// (everything visible), preserving existing behaviour.

interface ReturnOnboarding {
  clientType: 'individual' | 'business'
  answers: OnboardingAnswers
  completed: boolean
}

/** Read a specific user's persisted onboarding answers from localStorage. */
function loadUserOnboarding(userId: string): { answers: OnboardingAnswers; completed: boolean } {
  try {
    const raw = localStorage.getItem(`ledgerbridge-onboarding-${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw) as { answers?: OnboardingAnswers; status?: string; completed?: boolean }
      const completed = parsed.status ? parsed.status === 'completed' : !!parsed.completed
      return { answers: parsed.answers ?? {}, completed }
    }
  } catch { /* ignore */ }
  return { answers: {}, completed: false }
}

/**
 * Resolve the onboarding context for a return by looking up its client's user.
 * `clients` is passed in to avoid importing the demo store here (circular).
 */
export function getReturnOnboarding(
  returnId: string,
  clients: { id: string; userId: string; type: 'individual' | 'business' }[],
  returns: { id: string; clientId: string; type: 'individual' | 'business' }[],
): ReturnOnboarding | null {
  const ret = returns.find((r) => r.id === returnId)
  if (!ret) return null
  const client = clients.find((c) => c.id === ret.clientId)
  if (!client) return null
  const { answers, completed } = loadUserOnboarding(client.userId)
  return { clientType: client.type, answers, completed }
}

/**
 * Checklist filter for a return, applied on staff-facing screens.
 * Returns the wildcard (everything visible) for any return that is not one of
 * the answer-driven demo returns, or whose client has not completed onboarding.
 */
export function getChecklistForReturn(
  returnId: string,
  clients: { id: string; userId: string; type: 'individual' | 'business' }[],
  returns: { id: string; clientId: string; type: 'individual' | 'business' }[],
): ChecklistFilter {
  if (!DEMO_CLIENT_RETURN_IDS.includes(returnId as (typeof DEMO_CLIENT_RETURN_IDS)[number])) {
    return WILDCARD
  }
  const ob = getReturnOnboarding(returnId, clients, returns)
  if (!ob || !ob.completed) return WILDCARD
  return buildClientChecklist(ob.clientType, ob.answers, true)
}

/**
 * True for a managed demo return whose client has NOT yet completed onboarding.
 * Until then the preparer must not see the return's documents, fields, or AI
 * recommendations — that data only becomes available once the client submits
 * their information through onboarding.
 */
export function isReturnAwaitingOnboarding(
  returnId: string,
  clients: { id: string; userId: string; type: 'individual' | 'business' }[],
  returns: { id: string; clientId: string; type: 'individual' | 'business' }[],
): boolean {
  if (!DEMO_CLIENT_RETURN_IDS.includes(returnId as (typeof DEMO_CLIENT_RETURN_IDS)[number])) {
    return false
  }
  const ob = getReturnOnboarding(returnId, clients, returns)
  return !ob || !ob.completed
}
