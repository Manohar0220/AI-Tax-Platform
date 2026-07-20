import type {
  TaxReturn,
  Document,
  Task,
  ClientRequest,
  AIRecommendation,
  ReturnStage,
  Priority,
  RiskLevel,
  Role,
  DocumentStatus,
  TaskStatus,
  RequestStatus,
} from '@/domain/types'

// Deterministic pseudo-random number generator (mulberry32)
function createRng(seed: number) {
  let state = seed
  return function next(): number {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED = 20260718

const FIRST_NAMES = [
  'James', 'Maria', 'Robert', 'Jennifer', 'David', 'Linda', 'Michael', 'Patricia',
  'William', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Karen',
  'Christopher', 'Nancy', 'Charles', 'Lisa', 'Daniel', 'Margaret', 'Matthew', 'Dorothy',
  'Anthony', 'Sandra', 'Mark', 'Ashley', 'Steven', 'Kimberly', 'Andrew', 'Donna',
  'Paul', 'Emily', 'Joshua', 'Carol', 'Kenneth', 'Michelle', 'Kevin', 'Amanda',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
]

export const BUSINESS_NAMES = [
  'Oakwood Consulting', 'Bright Harbor Media', 'Summit Trail Designs', 'Cedar Point Services',
  'Mosaic Digital', 'Ironforge Solutions', 'Willow Creek Ventures', 'Apex Ridge Partners',
  'Blue Fern Collective', 'Sterling Gate Capital', 'North Shore Analytics', 'Golden Arch Labs',
  'Driftwood Creative', 'Pinecrest Holdings', 'Ember & Ash Studio',
]

const DOCUMENT_TYPES = [
  'W-2', '1099-INT', '1099-DIV', '1099-NEC', '1099-MISC', '1098', 'Receipt',
  'Bank Statement', 'Invoice', 'Financial Statement', 'K-1', 'Prior Return',
  'Insurance', 'Lease', 'Payroll', 'ID',
]

const STAGES: ReturnStage[] = [
  'collecting_information', 'waiting_on_client', 'ready_to_prepare', 'preparing',
  'ready_for_review', 'under_review', 'changes_requested',
  'waiting_for_client_approval', 'ready_to_file', 'filed', 'filing_rejected',
]

const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high']
const PREPARERS = ['user-maya', 'user-maya', 'user-maya', 'user-nina']
const REVIEWERS = ['user-daniel']

const DOC_STATUSES: DocumentStatus[] = [
  'received', 'processing', 'verified', 'needs_review', 'needs_replacement', 'duplicate_warning',
]

const TASK_STATUSES: TaskStatus[] = ['open', 'in_progress', 'completed', 'cancelled']
const REQUEST_STATUSES: RequestStatus[] = ['pending', 'fulfilled', 'overdue', 'cancelled']

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function generateDate(rng: () => number, startYear: number, endYear: number): string {
  const year = startYear + Math.floor(rng() * (endYear - startYear + 1))
  const month = 1 + Math.floor(rng() * 12)
  const day = 1 + Math.floor(rng() * 28)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function generateDeadline(rng: () => number): string {
  const deadlines = [
    '2026-03-15', '2026-03-31', '2026-04-15', '2026-04-15',
    '2026-04-15', '2026-09-15', '2026-10-15',
  ]
  return pick(rng, deadlines)
}

function stageToNextAction(stage: ReturnStage): { action: string; role: Role } {
  const map: Record<ReturnStage, { action: string; role: Role }> = {
    collecting_information: { action: 'Collect remaining documents', role: 'tax_preparer' },
    waiting_on_client: { action: 'Waiting for client to provide information', role: 'individual_taxpayer' },
    ready_to_prepare: { action: 'Begin return preparation', role: 'tax_preparer' },
    preparing: { action: 'Complete return preparation', role: 'tax_preparer' },
    ready_for_review: { action: 'Begin review', role: 'reviewer' },
    under_review: { action: 'Complete review', role: 'reviewer' },
    changes_requested: { action: 'Address reviewer feedback', role: 'tax_preparer' },
    waiting_for_client_approval: { action: 'Client approval needed', role: 'individual_taxpayer' },
    ready_to_file: { action: 'File the return', role: 'tax_preparer' },
    filed: { action: 'No action needed', role: 'tax_preparer' },
    filing_rejected: { action: 'Address filing rejection', role: 'tax_preparer' },
  }
  return map[stage]
}

export function generateReturns(count: number): TaxReturn[] {
  const rng = createRng(SEED)
  const returns: TaxReturn[] = []

  for (let i = 0; i < count; i++) {
    const id = `RET-${4000 + i}`
    const isIndividual = rng() > 0.35
    const firstName = pick(rng, FIRST_NAMES)
    const lastName = pick(rng, LAST_NAMES)
    const stage = pick(rng, STAGES)
    const { action, role } = stageToNextAction(stage)
    const priority = pick(rng, PRIORITIES)
    const risk = pick(rng, RISK_LEVELS)
    const hasBlocker = rng() < 0.2
    const deadline = generateDeadline(rng)
    const isOverdue = deadline < '2026-02-01' && stage !== 'filed'
    const completion = stage === 'filed' ? 100 :
      stage === 'ready_to_file' ? 95 :
      stage === 'waiting_for_client_approval' ? 90 :
      Math.floor(rng() * 85)

    // Derived without consuming additional RNG so the sequence stays deterministic.
    const clientName = isIndividual
      ? `${firstName} ${lastName}`
      : BUSINESS_NAMES[i % BUSINESS_NAMES.length]

    returns.push({
      id,
      clientId: `gen-client-${i}`,
      clientName,
      type: isIndividual ? 'individual' : 'business',
      taxYear: 2025,
      stage,
      preparerId: pick(rng, PREPARERS),
      reviewerId: pick(rng, REVIEWERS),
      deadline,
      priority: isOverdue ? 'high' : priority,
      riskLevel: risk,
      blocker: hasBlocker ? 'Missing required documentation' : null,
      nextAction: action,
      nextResponsibleRole: role,
      completionPercentage: completion,
      stageHistory: [{
        stage,
        enteredAt: generateDate(rng, 2025, 2026) + 'T10:00:00Z',
        completedAt: null,
        completedBy: null,
      }],
      createdAt: generateDate(rng, 2025, 2025) + 'T10:00:00Z',
      updatedAt: generateDate(rng, 2025, 2026) + 'T10:00:00Z',
    })

    // Skip unused values to maintain determinism
    rng(); rng()
  }

  return returns
}

export function generateDocuments(count: number): Document[] {
  const rng = createRng(SEED + 1000)
  const documents: Document[] = []
  const generatedReturns = generateReturns(80)

  for (let i = 0; i < count; i++) {
    const returnRef = pick(rng, generatedReturns)
    const docType = pick(rng, DOCUMENT_TYPES)
    const status = pick(rng, DOC_STATUSES)

    documents.push({
      id: `gen-doc-${i}`,
      returnId: returnRef.id,
      name: `${docType} — Document ${i + 1}`,
      type: docType,
      status,
      uploadedAt: generateDate(rng, 2025, 2026) + 'T' + String(8 + Math.floor(rng() * 10)).padStart(2, '0') + ':00:00Z',
      uploadedBy: rng() > 0.5 ? returnRef.clientId : returnRef.preparerId,
      pageCount: 1 + Math.floor(rng() * 12),
      fileSize: `${Math.floor(100 + rng() * 1400)} KB`,
      notes: status === 'needs_review' ? 'Requires manual verification.' : null,
    })
  }

  return documents
}

export function generateTasks(count: number): Task[] {
  const rng = createRng(SEED + 2000)
  const tasks: Task[] = []
  const generatedReturns = generateReturns(80)

  const taskTitles = [
    'Review uploaded documents', 'Verify income amounts', 'Check deduction eligibility',
    'Request missing document', 'Classify uploaded file', 'Reconcile bank statements',
    'Follow up with client', 'Prepare Schedule C', 'Verify prior-year carryforward',
    'Check estimated payments', 'Review state filing requirements', 'Validate entity information',
    'Cross-check 1099 totals', 'Confirm dependent eligibility', 'Review depreciation schedule',
  ]

  for (let i = 0; i < count; i++) {
    const returnRef = pick(rng, generatedReturns)
    const status = pick(rng, TASK_STATUSES)

    tasks.push({
      id: `gen-task-${i}`,
      returnId: returnRef.id,
      title: pick(rng, taskTitles),
      description: 'Generated task for demo purposes.',
      status,
      assignedTo: pick(rng, ['user-maya', 'user-nina', 'user-daniel']),
      createdBy: pick(rng, ['user-maya', 'user-daniel', 'user-priya']),
      dueDate: generateDate(rng, 2026, 2026),
      priority: pick(rng, PRIORITIES),
      createdAt: generateDate(rng, 2025, 2026) + 'T10:00:00Z',
      completedAt: status === 'completed' ? generateDate(rng, 2026, 2026) + 'T10:00:00Z' : null,
    })
  }

  return tasks
}

export function generateRequests(count: number): ClientRequest[] {
  const rng = createRng(SEED + 3000)
  const requests: ClientRequest[] = []
  const generatedReturns = generateReturns(80)

  const requestTitles = [
    'Upload W-2 from employer', 'Provide 1099 forms', 'Upload mortgage statement',
    'Confirm mailing address', 'Sign engagement letter', 'Upload prior-year return',
    'Provide business expenses', 'Confirm dependent information', 'Upload insurance documents',
    'Provide vehicle mileage log',
  ]

  for (let i = 0; i < count; i++) {
    const returnRef = pick(rng, generatedReturns)
    const status = pick(rng, REQUEST_STATUSES)

    requests.push({
      id: `gen-req-${i}`,
      returnId: returnRef.id,
      clientId: returnRef.clientId,
      title: pick(rng, requestTitles),
      description: 'Generated request for demo purposes.',
      status,
      requestedBy: pick(rng, ['user-maya', 'user-nina']),
      requestedAt: generateDate(rng, 2025, 2026) + 'T10:00:00Z',
      fulfilledAt: status === 'fulfilled' ? generateDate(rng, 2026, 2026) + 'T10:00:00Z' : null,
      dueDate: generateDate(rng, 2026, 2026),
    })
  }

  return requests
}

export function generateAIWarnings(count: number): AIRecommendation[] {
  const rng = createRng(SEED + 4000)
  const warnings: AIRecommendation[] = []
  const generatedReturns = generateReturns(80)

  const warningTypes: AIRecommendation['type'][] = [
    'warning', 'anomaly', 'suggestion', 'missing_item', 'duplicate', 'confirmation',
  ]

  const warningTitles = [
    'Income amount appears unusually high', 'Possible missing deduction',
    'Year-over-year change exceeds 50%', 'Document may be outdated',
    'Duplicate entry detected', 'Prior-year amount differs significantly',
    'Standard deduction may be more beneficial', 'Missing state filing requirement',
    'Estimated tax payment not reflected', 'Dependent age requires verification',
  ]

  for (let i = 0; i < count; i++) {
    const returnRef = pick(rng, generatedReturns)
    const type = pick(rng, warningTypes)
    const confidence = 30 + Math.floor(rng() * 70)

    warnings.push({
      id: `gen-ai-${i}`,
      returnId: returnRef.id,
      type,
      title: pick(rng, warningTitles),
      description: 'AI-generated observation for demo purposes.',
      evidence: 'Based on prior-year comparison and document analysis.',
      confidence: confidence > 80 ? 'high' : confidence > 55 ? 'medium' : 'low',
      confidenceScore: confidence,
      suggestedAction: 'Review and verify.',
      status: pick(rng, ['pending', 'pending', 'accepted', 'dismissed'] as const),
      createdAt: generateDate(rng, 2025, 2026) + 'T10:00:00Z',
    })
  }

  return warnings
}

export interface GeneratedData {
  returns: TaxReturn[]
  documents: Document[]
  tasks: Task[]
  requests: ClientRequest[]
  aiWarnings: AIRecommendation[]
}

export function generateAllScaleData(): GeneratedData {
  return {
    returns: generateReturns(80),
    documents: generateDocuments(250),
    tasks: generateTasks(180),
    requests: generateRequests(90),
    aiWarnings: generateAIWarnings(60),
  }
}
