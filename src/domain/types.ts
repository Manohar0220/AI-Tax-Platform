export type Role =
  | 'individual_taxpayer'
  | 'business_owner'
  | 'tax_preparer'
  | 'reviewer'
  | 'firm_administrator'

export type ReturnStage =
  | 'collecting_information'
  | 'waiting_on_client'
  | 'ready_to_prepare'
  | 'preparing'
  | 'ready_for_review'
  | 'under_review'
  | 'changes_requested'
  | 'waiting_for_client_approval'
  | 'ready_to_file'
  | 'filed'
  | 'filing_rejected'

export type ReturnType = 'individual' | 'business'

export type Priority = 'low' | 'medium' | 'high'

export type RiskLevel = 'low' | 'medium' | 'high'

export type DocumentStatus =
  | 'received'
  | 'processing'
  | 'verified'
  | 'needs_review'
  | 'needs_replacement'
  | 'missing'
  | 'duplicate_warning'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type FieldState =
  | 'ai_extracted'
  | 'verified'
  | 'editable'
  | 'locked'
  | 'needs_approval'
  | 'override'

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export type RequestStatus = 'pending' | 'fulfilled' | 'overdue' | 'cancelled'

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed'

export type MessageVisibility = 'client_visible' | 'internal_only'

export interface User {
  id: string
  name: string
  email: string
  roles: Role[]
  primaryRole: Role
  avatarInitials: string
  firmId?: string
  personalReturnId?: string
}

export interface Client {
  id: string
  userId: string
  name: string
  type: 'individual' | 'business'
  businessName?: string
  businessId?: string
  createdAt: string
}

export interface Business {
  id: string
  name: string
  ownerId: string
  ein: string
  entityType: string
}

export interface TaxReturn {
  id: string
  clientId: string
  /** Display name for generated returns that have no full Client record. */
  clientName?: string
  type: ReturnType
  taxYear: number
  stage: ReturnStage
  preparerId: string
  reviewerId: string
  deadline: string
  priority: Priority
  riskLevel: RiskLevel
  blocker: string | null
  nextAction: string
  nextResponsibleRole: Role
  completionPercentage: number
  stageHistory: StageHistoryEntry[]
  createdAt: string
  updatedAt: string
  /**
   * True when the client just completed onboarding and the return is newly
   * waiting for the preparer's first look. Used to surface a "New" indicator
   * and float the return to the top of the preparer's list. Cleared once the
   * preparer takes any action on the return.
   */
  justOnboarded?: boolean
  /**
   * True when the preparer just submitted the return for review and it is newly
   * waiting for the reviewer's first look. Surfaces a "New" indicator and floats
   * the return to the top of the reviewer's queue. Cleared once the reviewer
   * approves or requests changes.
   */
  justSubmittedForReview?: boolean
}

export interface StageHistoryEntry {
  stage: ReturnStage
  enteredAt: string
  completedAt: string | null
  completedBy: string | null
  /** Reason recorded when the return entered this stage. */
  reason?: string
}

export interface Document {
  id: string
  returnId: string
  name: string
  type: string
  status: DocumentStatus
  uploadedAt: string | null
  uploadedBy: string | null
  pageCount: number
  fileSize: string
  notes: string | null
}

export interface SourceLocation {
  documentId: string
  page: number
  section: string
  boundingBox?: { x: number; y: number; width: number; height: number }
}

export type FieldSection =
  | 'employment_income'
  | 'interest_income'
  | 'investment_income'
  | 'deductions'
  | 'childcare'
  | 'payments_withholding'
  // Business return sections
  | 'business_income'
  | 'business_expenses'
  | 'business_summary'

export interface ConflictingSource {
  documentId: string
  page: number
  section: string
  statedValue: number
  note: string
}

export interface ReturnField {
  id: string
  returnId: string
  section?: FieldSection
  line: string
  label: string
  value: number | string | null
  formattedValue: string
  sources: SourceLocation[]
  /** An alternate source that disagrees with the primary extraction (edge case). */
  sourceConflict?: ConflictingSource
  calculation: string | null
  confidence: ConfidenceLevel
  confidenceScore: number
  state: FieldState
  aiExtractedValue?: number | string
  /** The value legible on the source document (used to demonstrate the correction flow). */
  sourceStatedValue?: number
  correctedValue?: number | string
  correctedBy?: string
  correctionReason?: string
  verifiedBy?: string
  verifiedAt?: string
  lastChangedBy?: string
  lastChangedAt?: string
}

export type AIRecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'overridden' | 'escalated'

export interface AIRecommendation {
  id: string
  returnId: string
  fieldId?: string
  documentId?: string
  type: 'confirmation' | 'warning' | 'anomaly' | 'suggestion' | 'missing_item' | 'duplicate'
  title: string
  description: string
  evidence: string
  /** What the AI is unsure about — shown plainly, not just as a score. */
  uncertainty?: string
  /** Alternatives to the primary recommended action. */
  alternativeActions?: string[]
  confidence: ConfidenceLevel
  confidenceScore: number
  suggestedAction: string
  status: AIRecommendationStatus
  dismissReason?: string
  actedBy?: string
  actedAt?: string
  createdAt: string
}

export interface Issue {
  id: string
  returnId: string
  documentId?: string
  fieldId?: string
  title: string
  description: string
  status: IssueStatus
  priority: Priority
  assignedTo: string
  createdBy: string
  createdAt: string
  resolvedAt: string | null
}

export interface Task {
  id: string
  returnId: string
  title: string
  description: string
  status: TaskStatus
  assignedTo: string
  createdBy: string
  dueDate: string | null
  priority: Priority
  createdAt: string
  completedAt: string | null
}

export interface ClientRequest {
  id: string
  returnId: string
  clientId: string
  linkedDocumentId?: string
  title: string
  description: string
  status: RequestStatus
  requestedBy: string
  requestedAt: string
  fulfilledAt: string | null
  dueDate: string | null
}

export interface MessageThread {
  id: string
  returnId: string
  subject: string
  linkedDocumentId?: string
  linkedFieldId?: string
  linkedIssueId?: string
  visibility: MessageVisibility
  participants: string[]
  createdAt: string
  lastMessageAt: string
  /** Explicit override for whose turn it is. When absent, it is derived from the last message. */
  nextActionOwner?: 'client' | 'staff'
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  content: string
  sentAt: string
  readBy: string[]
  /**
   * Per-message visibility. When absent, the message inherits its thread's visibility.
   * An `internal_only` message inside a `client_visible` thread is a staff-only note
   * that clients must never see.
   */
  visibility?: MessageVisibility
}

export interface AuditEvent {
  id: string
  returnId: string
  userId: string
  action: string
  target: string
  details: string
  timestamp: string
}

export interface Calculation {
  id: string
  returnId: string
  fieldId: string
  formula: string
  inputs: { fieldId: string; label: string; value: number }[]
  result: number
}

export interface DemoState {
  users: User[]
  clients: Client[]
  businesses: Business[]
  returns: TaxReturn[]
  documents: Document[]
  fields: ReturnField[]
  recommendations: AIRecommendation[]
  issues: Issue[]
  tasks: Task[]
  requests: ClientRequest[]
  threads: MessageThread[]
  messages: Message[]
  auditEvents: AuditEvent[]
  calculations: Calculation[]
}
