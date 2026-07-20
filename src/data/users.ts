import type { User } from '@/domain/types'

export const DEMO_USERS: User[] = [
  {
    id: 'user-sarah',
    name: 'Manohar',
    email: 'sarah.morgan@example.test',
    roles: ['individual_taxpayer'],
    primaryRole: 'individual_taxpayer',
    avatarInitials: 'MN',
  },
  {
    id: 'user-alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.test',
    roles: ['business_owner'],
    primaryRole: 'business_owner',
    avatarInitials: 'AR',
  },
  {
    id: 'user-maya',
    name: 'Maya Patel',
    email: 'maya.patel@example.test',
    roles: ['tax_preparer', 'individual_taxpayer'],
    primaryRole: 'tax_preparer',
    avatarInitials: 'MP',
    firmId: 'firm-greenleaf',
    personalReturnId: 'RET-3001',
  },
  {
    id: 'user-daniel',
    name: 'Daniel Kim',
    email: 'daniel.kim@example.test',
    roles: ['reviewer'],
    primaryRole: 'reviewer',
    avatarInitials: 'DK',
    firmId: 'firm-greenleaf',
  },
  {
    id: 'user-priya',
    name: 'Priya Shah',
    email: 'priya.shah@example.test',
    roles: ['firm_administrator'],
    primaryRole: 'firm_administrator',
    avatarInitials: 'PS',
    firmId: 'firm-greenleaf',
  },
]

/**
 * Additional firm staff used for assignment/workload demos. These are not shown
 * on the demo login screen (that stays the five named personas) but are real
 * members of the firm that work can be assigned to.
 */
export const FIRM_STAFF: User[] = [
  {
    id: 'user-nina', name: 'Nina Alvarez', email: 'nina.alvarez@example.test',
    roles: ['tax_preparer'], primaryRole: 'tax_preparer', avatarInitials: 'NA', firmId: 'firm-greenleaf',
  },
  {
    id: 'user-omar', name: 'Omar Reyes', email: 'omar.reyes@example.test',
    roles: ['tax_preparer'], primaryRole: 'tax_preparer', avatarInitials: 'OR', firmId: 'firm-greenleaf',
  },
  {
    id: 'user-grace', name: 'Grace Lin', email: 'grace.lin@example.test',
    roles: ['reviewer'], primaryRole: 'reviewer', avatarInitials: 'GL', firmId: 'firm-greenleaf',
  },
]

/** Everyone at the firm (named demo personas + additional staff). */
export const ALL_STAFF_USERS: User[] = [...DEMO_USERS.filter((u) => u.firmId), ...FIRM_STAFF]
