import type { DemoState } from '@/domain/types'
import { DEMO_USERS, FIRM_STAFF } from './users'
import { DEMO_CLIENTS, DEMO_BUSINESSES } from './clients'
import { DEMO_RETURNS } from './returns'
import { DEMO_DOCUMENTS } from './documents'
import { DEMO_FIELDS, DEMO_CALCULATIONS } from './fields'
import { DEMO_RECOMMENDATIONS } from './ai-recommendations'
import { DEMO_ISSUES } from './issues'
import { DEMO_THREADS, DEMO_MESSAGES } from './messages'
import { DEMO_TASKS, DEMO_REQUESTS } from './tasks'
import { generateAllScaleData } from './generator'

export function createSeedState(): DemoState {
  const generated = generateAllScaleData()

  const state: DemoState = {
    users: [...DEMO_USERS, ...FIRM_STAFF],
    clients: DEMO_CLIENTS,
    businesses: DEMO_BUSINESSES,
    returns: [...DEMO_RETURNS, ...generated.returns],
    documents: [...DEMO_DOCUMENTS, ...generated.documents],
    fields: DEMO_FIELDS,
    recommendations: [...DEMO_RECOMMENDATIONS, ...generated.aiWarnings],
    issues: DEMO_ISSUES,
    tasks: [...DEMO_TASKS, ...generated.tasks],
    requests: [...DEMO_REQUESTS, ...generated.requests],
    threads: DEMO_THREADS,
    messages: DEMO_MESSAGES,
    auditEvents: [],
    calculations: DEMO_CALCULATIONS,
  }

  return structuredClone(state)
}
