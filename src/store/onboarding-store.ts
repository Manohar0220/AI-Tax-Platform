/**
 * Per-user onboarding store.
 *
 * Each user gets their own isolated onboarding state stored under
 * `ledgerbridge-onboarding-{userId}`. This ensures Manohar and Alex
 * never share completed status, and Reset Demo resets both.
 *
 * State is: not_started | in_progress | completed
 */
import { create } from 'zustand'

// ─────────────────────────────── Answer shape ───────────────────────────────

export interface OnboardingAnswers {
  // ── Individual ──────────────────────────────────────────────────────────
  filingStatus?: 'single' | 'married_jointly' | 'married_separately' | 'head_of_household'
  hasDependents?: boolean
  dependentCount?: number
  hasW2Employment?: boolean
  hasInvestments?: boolean
  hasCharitableDonations?: boolean
  ownsHome?: boolean
  homeAction?: 'none' | 'bought' | 'sold' | 'refinanced'
  hasMortgage?: boolean
  hasDividends?: boolean
  hasCrypto?: boolean
  hasRetirementContributions?: boolean
  hasChildcare?: boolean
  hasFreelanceIncome?: boolean
  hasUnemployment?: boolean
  hasStudentLoans?: boolean
  hasHealthInsurance?: boolean
  dateOfBirth?: string
  dependentNames?: string
  employerCount?: number

  // ── Business ────────────────────────────────────────────────────────────
  businessName?: string
  entityType?: string
  businessActivity?: string
  wasActiveInYear?: boolean
  hasBusinessIncome?: boolean
  hasEmployees?: boolean
  hasContractors?: boolean
  hasMajorPurchases?: boolean
  hasHomeBased?: boolean
  grossReceipts?: string
  hasMiscIncome?: boolean
  hasVehicle?: boolean
  hasTravelExpenses?: boolean
  hasHomeOffice?: boolean
  employeeCount?: number
  majorPurchaseDescription?: string
  stateOfOperation?: string
  businessStarted?: string
}

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed'

interface PerUserState {
  currentSection: number
  answers: OnboardingAnswers
  status: OnboardingStatus
}

// ─────────────────────────────── Persistence ────────────────────────────────

function storageKey(userId: string) {
  return `ledgerbridge-onboarding-${userId}`
}

function load(userId: string): PerUserState {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PerUserState>
      // Migrate legacy format (completed boolean → status string)
      if (!parsed.status && 'completed' in (parsed as Record<string, unknown>)) {
        parsed.status = (parsed as unknown as { completed: boolean }).completed ? 'completed' : 'not_started'
      }
      return {
        currentSection: parsed.currentSection ?? 0,
        answers: parsed.answers ?? {},
        status: parsed.status ?? 'not_started',
      }
    }
  } catch { /* ignore */ }
  return { currentSection: 0, answers: {}, status: 'not_started' }
}

function save(userId: string, state: PerUserState) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(state)) } catch { /* ignore */ }
}

function clear(userId: string) {
  try { localStorage.removeItem(storageKey(userId)) } catch { /* ignore */ }
}

/**
 * Read a specific user's onboarding answers + completion directly from storage.
 * Used by staff-facing views to relevance-filter a client's return without that
 * client being the currently-logged-in user.
 */
export function readOnboardingForUser(userId: string): { answers: OnboardingAnswers; completed: boolean } {
  const s = load(userId)
  return { answers: s.answers, completed: s.status === 'completed' }
}

// ─────────────────────────────── Store ──────────────────────────────────────

interface OnboardingStore {
  userId: string | null
  currentSection: number
  answers: OnboardingAnswers
  status: OnboardingStatus
  /** Convenience: true only when status === 'completed'. */
  completed: boolean

  loadForUser: (userId: string) => void
  setAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void
  setSection: (section: number) => void
  /**
   * Mark onboarding completed and trigger return-state reconciliation.
   */
  completeOnboarding: () => void
  reset: () => void
  resetUser: (userId: string) => void
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  userId: null,
  currentSection: 0,
  answers: {},
  status: 'not_started',
  completed: false,

  loadForUser: (userId) => {
    const state = load(userId)
    set({
      userId,
      currentSection: state.currentSection,
      answers: state.answers,
      status: state.status,
      completed: state.status === 'completed',
    })
  },

  setAnswer: (key, value) => {
    const { userId, currentSection, answers, status } = get()
    const newAnswers = { ...answers, [key]: value }
    const newStatus: OnboardingStatus = status === 'not_started' ? 'in_progress' : status
    const newState: PerUserState = { currentSection, answers: newAnswers, status: newStatus }
    if (userId) save(userId, newState)
    set({ answers: newAnswers, status: newStatus, completed: newStatus === 'completed' })
  },

  setSection: (section) => {
    const { userId, answers, status } = get()
    const newStatus: OnboardingStatus = status === 'not_started' ? 'in_progress' : status
    const newState: PerUserState = { currentSection: section, answers, status: newStatus }
    if (userId) save(userId, newState)
    set({ currentSection: section, status: newStatus, completed: newStatus === 'completed' })
  },

  completeOnboarding: () => {
    const { userId, currentSection, answers } = get()
    const newState: PerUserState = { currentSection, answers, status: 'completed' }
    if (userId) save(userId, newState)
    set({ status: 'completed', completed: true })

    // Reconcile return state (lazy import to avoid circular deps at module init).
    const uid = userId
    const ans = answers
    import('@/services/onboarding-finalize').then(({ finalizeOnboarding }) => {
      finalizeOnboarding(uid ?? '', ans)
    })
  },

  reset: () => {
    const { userId } = get()
    if (userId) clear(userId)
    set({ currentSection: 0, answers: {}, status: 'not_started', completed: false })
  },

  resetUser: (userId) => {
    clear(userId)
    if (get().userId === userId) {
      set({ currentSection: 0, answers: {}, status: 'not_started', completed: false })
    }
  },
}))
