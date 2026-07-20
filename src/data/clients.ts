import type { Client, Business } from '@/domain/types'

export const DEMO_CLIENTS: Client[] = [
  {
    id: 'client-sarah',
    userId: 'user-sarah',
    name: 'Manohar',
    type: 'individual',
    createdAt: '2025-12-10T09:00:00Z',
  },
  {
    id: 'client-alex',
    userId: 'user-alex',
    name: 'Alex Rivera',
    type: 'business',
    businessName: 'River & Pine Studio LLC',
    businessId: 'biz-riverpine',
    createdAt: '2025-09-15T14:00:00Z',
  },
  {
    id: 'client-maya-personal',
    userId: 'user-maya',
    name: 'Maya Patel',
    type: 'individual',
    createdAt: '2025-11-01T10:00:00Z',
  },
]

export const DEMO_BUSINESSES: Business[] = [
  {
    id: 'biz-riverpine',
    name: 'River & Pine Studio LLC',
    ownerId: 'user-alex',
    ein: '**-***4521',
    entityType: 'LLC',
  },
]
