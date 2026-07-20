export interface QuestionItem {
  id: string
  returnId: string
  category: string
  question: string
  reason: string
  relatedDocumentId?: string
  relatedTopic?: string
  type: 'yes_no' | 'text' | 'select' | 'currency'
  options?: string[]
  answer?: string
  answeredAt?: string
  required: boolean
  /**
   * When true the preparer has sent this question to the client.
   * Before that, it must not appear in client-facing views.
   */
  sentToClient?: boolean
}

export const DEMO_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-refinance',
    returnId: 'RET-1001',
    category: 'Home',
    question: 'Did you refinance your mortgage in 2025?',
    reason: 'If you refinanced, we need both the old and new 1098 statements to correctly allocate mortgage interest.',
    relatedDocumentId: 'doc-homefirst-mortgage',
    relatedTopic: 'Mortgage Interest Deduction',
    type: 'yes_no',
    answer: undefined,
    required: true,
  },
  {
    id: 'q-childcare-work',
    returnId: 'RET-1001',
    category: 'Family',
    question: 'Were the childcare expenses paid so that you could work or look for work?',
    reason: 'The child and dependent care credit only applies when care is provided so you can work or seek employment.',
    relatedDocumentId: 'doc-brightsteps-childcare',
    relatedTopic: 'Child Care Credit',
    type: 'yes_no',
    answer: 'yes',
    answeredAt: '2026-01-12T14:00:00Z',
    required: true,
  },
  {
    id: 'q-childcare-provider',
    returnId: 'RET-1001',
    category: 'Family',
    question: 'What is the name and tax ID of the childcare provider?',
    reason: 'We need the provider details to complete Form 2441 for the dependent care credit.',
    relatedDocumentId: 'doc-brightsteps-childcare',
    relatedTopic: 'Child Care Credit',
    type: 'text',
    answer: 'Bright Steps Learning Center, EIN **-***7890',
    answeredAt: '2026-01-12T14:05:00Z',
    required: true,
  },
  {
    id: 'q-donation-substantiation',
    returnId: 'RET-1001',
    category: 'Deductions',
    question: 'Did the Community Food Fund provide any goods or services in exchange for your $2,100 donation?',
    reason: 'Donations over $250 require substantiation that no goods or services were received in return.',
    relatedDocumentId: 'doc-community-donation',
    relatedTopic: 'Charitable Deductions',
    type: 'yes_no',
    answer: 'no',
    answeredAt: '2026-01-13T09:30:00Z',
    required: true,
  },
  {
    id: 'q-other-income',
    returnId: 'RET-1001',
    category: 'Income',
    question: 'Did you receive any other income not covered by your W-2s or investment statements? Examples include rental income, alimony, or gambling winnings.',
    reason: 'All income must be reported regardless of whether a tax form was issued.',
    relatedTopic: 'Total Income',
    type: 'yes_no',
    answer: undefined,
    required: true,
  },
  {
    id: 'q-health-coverage',
    returnId: 'RET-1001',
    category: 'Insurance',
    question: 'Did you have health insurance coverage for all 12 months of 2025?',
    reason: 'This determines whether any shared responsibility payment applies and eligibility for premium tax credits.',
    relatedTopic: 'Health Coverage',
    type: 'yes_no',
    answer: undefined,
    required: false,
  },
  {
    id: 'q-equipment-use',
    returnId: 'RET-2001',
    category: 'Business Expenses',
    question: 'Was the $12,500 computer equipment used entirely for business purposes?',
    reason: 'If the equipment is used partly for personal purposes, only the business-use percentage can be deducted under Section 179.',
    relatedDocumentId: 'doc-rp-equipment',
    relatedTopic: 'Section 179 Deduction',
    type: 'select',
    options: ['Yes, 100% business use', 'Mostly business (75-99%)', 'Partially business (50-74%)', 'Less than 50% business'],
    answer: undefined,
    required: true,
  },
  {
    id: 'q-equipment-placed',
    returnId: 'RET-2001',
    category: 'Business Expenses',
    question: 'When was the equipment first placed in service for your business?',
    reason: 'The date the equipment was put into use determines the depreciation start date and first-year deduction amount.',
    relatedDocumentId: 'doc-rp-equipment',
    relatedTopic: 'Section 179 Deduction',
    type: 'text',
    answer: undefined,
    required: true,
  },
  {
    id: 'q-home-office',
    returnId: 'RET-2001',
    category: 'Business Expenses',
    question: 'Do you use a portion of your home exclusively for business?',
    reason: 'You may be able to deduct a portion of your home expenses if you have a dedicated workspace.',
    relatedTopic: 'Home Office Deduction',
    type: 'yes_no',
    answer: 'yes',
    answeredAt: '2025-11-10T11:00:00Z',
    required: false,
  },
]
