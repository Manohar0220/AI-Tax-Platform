import { create } from 'zustand'
import type { DemoState } from '@/domain/types'
import { loadDemoState, saveDemoState, resetDemoState } from '@/data/persistence'
import { useOnboardingStore } from '@/store/onboarding-store'
import { useQuestionnaireStore } from '@/store/questionnaire-store'
import { MANAGED_CLIENT_USER_IDS } from '@/services/managed-returns'

// CLIENT USER IDs whose onboarding should be reset together with demo data.
const CLIENT_USER_IDS = [...MANAGED_CLIENT_USER_IDS]

interface DemoStore extends DemoState {
  reset: () => void
  updateState: (partial: Partial<DemoState>) => void
}

export const useDemoStore = create<DemoStore>((set) => ({
  ...loadDemoState(),

  reset: () => {
    const fresh = resetDemoState()
    // Reset onboarding state for all client users so they see onboarding again.
    const { resetUser } = useOnboardingStore.getState()
    CLIENT_USER_IDS.forEach((id) => resetUser(id))
    // Clear any client-visible questions so none are preset after a reset.
    useQuestionnaireStore.getState().reset()
    set(fresh)
  },

  updateState: (partial) => {
    set((state) => {
      const next = { ...state, ...partial }
      saveDemoState(next)
      return next
    })
  },
}))
