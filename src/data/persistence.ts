import type { DemoState } from '@/domain/types'
import { createSeedState } from './seed'
import { applyCleanSlate } from '@/services/managed-returns'

const STORAGE_KEY = 'ledgerbridge-demo-state'
const VERSION_KEY = 'ledgerbridge-demo-version'
const CURRENT_VERSION = '8'

export function loadDemoState(): DemoState {
  try {
    const version = localStorage.getItem(VERSION_KEY)
    if (version !== CURRENT_VERSION) {
      return resetDemoState()
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as DemoState
    }
  } catch {
    // If parsing fails, reset to seed
  }

  return resetDemoState()
}

export function saveDemoState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
  } catch {
    // localStorage might be full or unavailable — fail silently in demo
  }
}

export function resetDemoState(): DemoState {
  // The live app starts the two managed returns (Manohar, Alex) with a clean
  // slate — no preset workflow. Tests use createSeedState() directly for the
  // full seed, so this transform only affects the running app.
  const seed = applyCleanSlate(createSeedState())
  saveDemoState(seed)
  return seed
}

export function hasSavedState(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}
