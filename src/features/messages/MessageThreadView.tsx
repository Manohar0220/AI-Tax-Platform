import { Lock, FileText, AlertTriangle, Hash, ExternalLink, UserCheck, ArrowLeftRight } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { Badge } from '@/components/feedback/Badge'
import { cn } from '@/utils/cn'
import type { MessageThread, Role } from '@/domain/types'
import {
  filterMessagesForRole,
  effectiveMessageVisibility,
  isStaffRole,
  isStaffUser,
  getThreadNextActionOwner,
  setThreadNextActionOwner,
} from '@/services/collaboration-service'
import { MessageComposer } from './MessageComposer'
import type { RelatedObjectRef } from './RelatedObjectPreview'

interface MessageThreadViewProps {
  thread: MessageThread
  viewerRole: Role
  viewerUserId: string
  onOpenRelated: (ref: RelatedObjectRef) => void
}

export function MessageThreadView({ thread, viewerRole, viewerUserId, onOpenRelated }: MessageThreadViewProps) {
  const users = useDemoStore((s) => s.users)
  const messages = useDemoStore((s) => s.messages)
  const documents = useDemoStore((s) => s.documents)
  const issues = useDemoStore((s) => s.issues)

  const staffViewer = isStaffRole(viewerRole)
  const visibleMessages = filterMessagesForRole(messages, thread, viewerRole)
  const nextOwner = getThreadNextActionOwner(thread, messages, users)

  const relatedRef: RelatedObjectRef = {
    documentId: thread.linkedDocumentId,
    issueId: thread.linkedIssueId,
    fieldId: thread.linkedFieldId,
  }
  const hasRelated = !!(thread.linkedDocumentId || thread.linkedIssueId || thread.linkedFieldId)

  const relatedDoc = thread.linkedDocumentId ? documents.find((d) => d.id === thread.linkedDocumentId) : undefined
  const relatedIssue = thread.linkedIssueId ? issues.find((i) => i.id === thread.linkedIssueId) : undefined
  const relatedLabel = relatedDoc?.name || relatedIssue?.title || 'Related field'
  const RelatedIcon = relatedDoc ? FileText : relatedIssue ? AlertTriangle : Hash

  const userName = (id: string) => users.find((u) => u.id === id)?.name || 'Unknown'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-text-primary">{thread.subject}</h2>
              {thread.visibility === 'internal_only' && (
                <Badge variant="warning" className="shrink-0">
                  <Lock className="h-3 w-3" /> Internal
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {thread.participants.map(userName).join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {hasRelated && (
            <button
              onClick={() => onOpenRelated(relatedRef)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border-default bg-neutral-50 text-xs text-text-secondary hover:bg-neutral-100"
            >
              <RelatedIcon className="h-3.5 w-3.5" />
              <span className="max-w-[12rem] truncate">{relatedLabel}</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </button>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
              nextOwner === 'client' ? 'bg-warning-50 text-warning-700' : 'bg-primary-50 text-primary-700',
            )}
          >
            <UserCheck className="h-3.5 w-3.5" />
            {nextOwner === 'client' ? 'Waiting on client' : 'Waiting on firm'}
          </span>
          {staffViewer && (
            <button
              onClick={() =>
                setThreadNextActionOwner(thread.id, nextOwner === 'client' ? 'staff' : 'client', viewerUserId)
              }
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border-default text-xs text-text-secondary hover:bg-neutral-50"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Change owner
            </button>
          )}
        </div>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No messages yet.</p>
        ) : (
          visibleMessages.map((m) => {
            const internal = effectiveMessageVisibility(m, thread) === 'internal_only'
            const fromStaff = isStaffUser(m.senderId, users)
            return (
              <div
                key={m.id}
                className={cn(
                  'rounded-lg border p-3',
                  internal
                    ? 'border-warning-500/40 bg-warning-50'
                    : fromStaff
                      ? 'border-border-default bg-surface-card'
                      : 'border-primary-200 bg-primary-50/40',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-text-primary truncate">{userName(m.senderId)}</span>
                    <span className="text-xs text-text-muted">
                      {fromStaff ? 'Firm' : 'Client'}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted shrink-0">
                    {new Date(m.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {internal && (
                  <p className="flex items-center gap-1 text-xs font-medium text-warning-700 mb-1">
                    <Lock className="h-3 w-3" />
                    Internal — client cannot see this
                  </p>
                )}
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{m.content}</p>
              </div>
            )
          })
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        threadId={thread.id}
        senderId={viewerUserId}
        threadVisibility={thread.visibility}
        canPostInternal={staffViewer}
        recipientName={staffViewer ? 'The client' : 'Your preparer'}
      />
    </div>
  )
}
