import { describe, it, expect, beforeEach } from 'vitest'
import {
  isStaffRole,
  canRoleSeeThread,
  canRoleSeeMessage,
  filterThreadsForRole,
  filterMessagesForRole,
  getThreadNextActionOwner,
  getRequestNextActionOwner,
  postMessage,
  resolveRequest,
  reopenRequest,
  assignTaskFromRequest,
} from './collaboration-service'
import { DEMO_THREADS, DEMO_MESSAGES } from '@/data/messages'
import { DEMO_USERS } from '@/data/users'
import { useDemoStore } from '@/store/demo-store'
import { createSeedState } from '@/data/seed'
import type { Role } from '@/domain/types'

const CLIENT_ROLES: Role[] = ['individual_taxpayer', 'business_owner']
const STAFF_ROLES: Role[] = ['tax_preparer', 'reviewer', 'firm_administrator']

const internalThread = DEMO_THREADS.find((t) => t.id === 'thread-wage-internal')!
const clientVisibleThread = DEMO_THREADS.find((t) => t.id === 'thread-mortgage-request')!
const internalNote = DEMO_MESSAGES.find((m) => m.id === 'msg-mort-internal-1')!

describe('collaboration-service — role helpers', () => {
  it('classifies staff and client roles', () => {
    STAFF_ROLES.forEach((r) => expect(isStaffRole(r)).toBe(true))
    CLIENT_ROLES.forEach((r) => expect(isStaffRole(r)).toBe(false))
    expect(isStaffRole(null)).toBe(false)
  })
})

describe('collaboration-service — clients cannot read internal notes', () => {
  it('hides internal-only threads from every client role', () => {
    CLIENT_ROLES.forEach((role) => {
      expect(canRoleSeeThread(internalThread, role)).toBe(false)
    })
  })

  it('shows internal-only threads to every staff role', () => {
    STAFF_ROLES.forEach((role) => {
      expect(canRoleSeeThread(internalThread, role)).toBe(true)
    })
  })

  it('excludes internal-only threads from filtered client thread lists', () => {
    CLIENT_ROLES.forEach((role) => {
      const visible = filterThreadsForRole(DEMO_THREADS, role, 'RET-1001')
      expect(visible.some((t) => t.visibility === 'internal_only')).toBe(false)
    })
  })

  it('hides an internal note that lives inside a client-visible thread', () => {
    // The note is internal_only even though its thread is client_visible.
    expect(internalNote.visibility).toBe('internal_only')
    expect(clientVisibleThread.visibility).toBe('client_visible')

    CLIENT_ROLES.forEach((role) => {
      expect(canRoleSeeMessage(internalNote, clientVisibleThread, role)).toBe(false)
    })
    STAFF_ROLES.forEach((role) => {
      expect(canRoleSeeMessage(internalNote, clientVisibleThread, role)).toBe(true)
    })
  })

  it('never returns an internal message to a client across all threads', () => {
    CLIENT_ROLES.forEach((role) => {
      const visibleThreads = filterThreadsForRole(DEMO_THREADS, role)
      visibleThreads.forEach((thread) => {
        const msgs = filterMessagesForRole(DEMO_MESSAGES, thread, role)
        msgs.forEach((m) => {
          const effective = m.visibility ?? thread.visibility
          expect(effective).toBe('client_visible')
        })
      })
    })
  })

  it('lets clients read the client-visible messages of the mortgage thread', () => {
    const msgs = filterMessagesForRole(DEMO_MESSAGES, clientVisibleThread, 'individual_taxpayer')
    expect(msgs.length).toBeGreaterThan(0)
    expect(msgs.some((m) => m.id === 'msg-mort-1')).toBe(true)
    expect(msgs.some((m) => m.id === 'msg-mort-internal-1')).toBe(false)
  })
})

describe('collaboration-service — next-action ownership', () => {
  it('derives client turn after a staff message', () => {
    const owner = getThreadNextActionOwner(
      DEMO_THREADS.find((t) => t.id === 'thread-blurry-id')!,
      DEMO_MESSAGES,
      DEMO_USERS,
    )
    expect(owner).toBe('client')
  })

  it('respects an explicit next-action override', () => {
    const dup = DEMO_THREADS.find((t) => t.id === 'thread-duplicate-w2')!
    expect(getThreadNextActionOwner(dup, DEMO_MESSAGES, DEMO_USERS)).toBe('client')
  })

  it('maps request status to the correct owner', () => {
    expect(getRequestNextActionOwner({ status: 'pending' } as never)).toBe('client')
    expect(getRequestNextActionOwner({ status: 'fulfilled' } as never)).toBe('staff')
  })
})

describe('collaboration-service — mutations persist through the store', () => {
  beforeEach(() => {
    useDemoStore.setState(createSeedState())
  })

  it('posts a client-visible message and flips the turn to the client', () => {
    const before = useDemoStore.getState().messages.length
    postMessage({ threadId: 'thread-mortgage-request', senderId: 'user-maya', content: 'Following up.' })
    const state = useDemoStore.getState()
    expect(state.messages.length).toBe(before + 1)
    const thread = state.threads.find((t) => t.id === 'thread-mortgage-request')!
    expect(thread.nextActionOwner).toBe('client')
  })

  it('posts an internal note that no client role can read', () => {
    postMessage({
      threadId: 'thread-mortgage-request',
      senderId: 'user-maya',
      content: 'Do not share: flag for manager review.',
      visibility: 'internal_only',
    })
    const state = useDemoStore.getState()
    const thread = state.threads.find((t) => t.id === 'thread-mortgage-request')!
    const clientMessages = filterMessagesForRole(state.messages, thread, 'individual_taxpayer')
    expect(clientMessages.some((m) => m.content.includes('Do not share'))).toBe(false)
    const staffMessages = filterMessagesForRole(state.messages, thread, 'tax_preparer')
    expect(staffMessages.some((m) => m.content.includes('Do not share'))).toBe(true)
  })

  it('resolves and reopens a request', () => {
    const reqId = useDemoStore.getState().requests[0].id
    resolveRequest(reqId, 'user-maya')
    expect(useDemoStore.getState().requests.find((r) => r.id === reqId)!.status).toBe('fulfilled')
    reopenRequest(reqId, 'user-maya')
    expect(useDemoStore.getState().requests.find((r) => r.id === reqId)!.status).toBe('pending')
  })

  it('creates an assigned task from a request', () => {
    const reqId = useDemoStore.getState().requests[0].id
    const before = useDemoStore.getState().tasks.length
    const task = assignTaskFromRequest(reqId, 'user-nina', 'user-maya')
    expect(task).not.toBeNull()
    expect(useDemoStore.getState().tasks.length).toBe(before + 1)
    expect(task!.assignedTo).toBe('user-nina')
  })
})
