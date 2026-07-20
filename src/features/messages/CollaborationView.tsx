import { useMemo, useState } from 'react'
import { MessageSquare, Lock, ChevronLeft } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { EmptyState } from '@/components/status'
import { cn } from '@/utils/cn'
import type { ClientRequest, Role } from '@/domain/types'
import {
  filterThreadsForRole,
  getThreadNextActionOwner,
  createThread,
} from '@/services/collaboration-service'
import { MessageThreadView } from './MessageThreadView'
import { RequestCard } from './RequestCard'
import { RelatedObjectPreview, type RelatedObjectRef } from './RelatedObjectPreview'

interface CollaborationViewProps {
  returnId: string
  viewerRole: Role
  viewerUserId: string
  clientId?: string
}

export function CollaborationView({ returnId, viewerRole, viewerUserId, clientId }: CollaborationViewProps) {
  const threads = useDemoStore((s) => s.threads)
  const messages = useDemoStore((s) => s.messages)
  const requests = useDemoStore((s) => s.requests)
  const users = useDemoStore((s) => s.users)
  const returns = useDemoStore((s) => s.returns)

  const visibleThreads = useMemo(
    () =>
      filterThreadsForRole(threads, viewerRole, returnId).sort((a, b) =>
        b.lastMessageAt.localeCompare(a.lastMessageAt),
      ),
    [threads, viewerRole, returnId],
  )

  const returnRequests = useMemo(
    () =>
      requests
        .filter((r) => r.returnId === returnId && (!clientId || r.clientId === clientId))
        // Requests are created by explicit preparer actions, so they always show
        // to the client regardless of the onboarding-answer relevance filter.
        .sort((a, b) => {
          const openA = a.status === 'pending' || a.status === 'overdue' ? 0 : 1
          const openB = b.status === 'pending' || b.status === 'overdue' ? 0 : 1
          return openA - openB
        }),
    [requests, returnId, clientId],
  )

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    visibleThreads[0]?.id ?? null,
  )
  const [related, setRelated] = useState<RelatedObjectRef | null>(null)
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false)

  const selectedThread = visibleThreads.find((t) => t.id === selectedThreadId) ?? null

  const handleAsk = (request: ClientRequest) => {
    const ret = returns.find((r) => r.id === request.returnId)
    const preparerId = ret?.preparerId || 'user-maya'
    const newId = createThread({
      returnId: request.returnId,
      subject: `Question: ${request.title}`,
      authorId: viewerUserId,
      content: `I have a question about this request: ${request.title}.`,
      participants: [viewerUserId, preparerId],
      visibility: 'client_visible',
    })
    setSelectedThreadId(newId)
    setShowDetailOnMobile(true)
  }

  const openThread = (id: string) => {
    setSelectedThreadId(id)
    setShowDetailOnMobile(true)
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Messages &amp; Requests</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Conversations and requests stay attached to the document, issue, or return field they are about.
        </p>
      </div>

      {/* Requests */}
      {returnRequests.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
            Requests
          </h2>
          <div className="space-y-2">
            {returnRequests.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                viewerRole={viewerRole}
                viewerUserId={viewerUserId}
                onAsk={handleAsk}
              />
            ))}
          </div>
        </section>
      )}

      {/* Conversations */}
      <section>
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
          Conversations
        </h2>

        {visibleThreads.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Messages about your documents and questions will appear here."
            icon={<MessageSquare className="h-12 w-12" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-3 border border-border-default rounded-lg overflow-hidden bg-surface-card">
            {/* Thread list */}
            <ul
              className={cn(
                'border-r border-border-default divide-y divide-border-default md:block',
                showDetailOnMobile && 'hidden',
              )}
            >
              {visibleThreads.map((t) => {
                const owner = getThreadNextActionOwner(t, messages, users)
                const last = messages
                  .filter((m) => m.threadId === t.id)
                  .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0]
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => openThread(t.id)}
                      className={cn(
                        'w-full text-left p-3 hover:bg-neutral-50 transition-colors',
                        selectedThreadId === t.id && 'bg-primary-50',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {t.visibility === 'internal_only' && (
                          <Lock className="h-3.5 w-3.5 text-warning-600 shrink-0" aria-label="Internal thread" />
                        )}
                        <span className="text-sm font-medium text-text-primary truncate">{t.subject}</span>
                      </div>
                      {last && (
                        <p className="text-xs text-text-muted truncate mt-0.5">{last.content}</p>
                      )}
                      <div className="mt-1">
                        <Badge variant={owner === 'client' ? 'warning' : 'primary'}>
                          {owner === 'client' ? 'Waiting on client' : 'Waiting on firm'}
                        </Badge>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Thread detail */}
            <div className={cn('min-h-[24rem] flex flex-col', !showDetailOnMobile && 'hidden md:flex')}>
              {selectedThread ? (
                <>
                  <button
                    onClick={() => setShowDetailOnMobile(false)}
                    className="md:hidden flex items-center gap-1 p-2 text-sm text-text-link border-b border-border-default"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    All conversations
                  </button>
                  <MessageThreadView
                    key={selectedThread.id}
                    thread={selectedThread}
                    viewerRole={viewerRole}
                    viewerUserId={viewerUserId}
                    onOpenRelated={setRelated}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-text-muted">
                  Select a conversation to read it.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <RelatedObjectPreview open={!!related} onClose={() => setRelated(null)} target={related} />
    </div>
  )
}
