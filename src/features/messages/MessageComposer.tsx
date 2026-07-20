import { useState } from 'react'
import { Send, Lock, Eye } from 'lucide-react'
import { Textarea, Button } from '@/components/forms'
import { cn } from '@/utils/cn'
import { postMessage } from '@/services/collaboration-service'
import type { MessageVisibility } from '@/domain/types'

interface MessageComposerProps {
  threadId: string
  senderId: string
  /** The visibility of the thread this composer posts into. */
  threadVisibility: MessageVisibility
  /** Staff may add internal notes; clients may not. */
  canPostInternal: boolean
  /** Recipient name to show on client-visible messages. */
  recipientName: string
  onSent?: () => void
}

export function MessageComposer({
  threadId,
  senderId,
  threadVisibility,
  canPostInternal,
  recipientName,
  onSent,
}: MessageComposerProps) {
  // Inside an internal-only thread everything is internal. Inside a client-visible
  // thread, staff can choose to drop an internal note instead of a client message.
  const threadIsInternal = threadVisibility === 'internal_only'
  const [mode, setMode] = useState<MessageVisibility>(threadIsInternal ? 'internal_only' : 'client_visible')
  const [text, setText] = useState('')

  const effectiveMode: MessageVisibility = threadIsInternal ? 'internal_only' : mode
  const isInternal = effectiveMode === 'internal_only'

  const handleSend = () => {
    if (!text.trim()) return
    postMessage({
      threadId,
      senderId,
      content: text,
      visibility: isInternal ? 'internal_only' : undefined,
    })
    setText('')
    onSent?.()
  }

  return (
    <div
      className={cn(
        'border-t p-3',
        isInternal ? 'border-warning-500/40 bg-warning-50/50' : 'border-border-default bg-surface-card',
      )}
    >
      {/* Mode toggle — only for staff in a client-visible thread */}
      {canPostInternal && !threadIsInternal && (
        <div className="flex gap-1 mb-2" role="tablist" aria-label="Message type">
          <button
            role="tab"
            aria-selected={!isInternal}
            onClick={() => setMode('client_visible')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors',
              !isInternal
                ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                : 'border-border-default text-text-muted hover:bg-neutral-50',
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Client-visible message
          </button>
          <button
            role="tab"
            aria-selected={isInternal}
            onClick={() => setMode('internal_only')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors',
              isInternal
                ? 'border-warning-500 bg-warning-100 text-warning-700 font-medium'
                : 'border-border-default text-text-muted hover:bg-neutral-50',
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            Internal note
          </button>
        </div>
      )}

      {/* Context line: who sees this */}
      <div className="flex items-center gap-1.5 mb-2 text-xs">
        {isInternal ? (
          <span className="flex items-center gap-1.5 text-warning-700 font-medium">
            <Lock className="h-3.5 w-3.5" />
            Internal — client cannot see this
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-text-muted">
            <Eye className="h-3.5 w-3.5" />
            {recipientName} will see this message
          </span>
        )}
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isInternal ? 'Write a note for your team…' : `Write a message to ${recipientName}…`}
        aria-label={isInternal ? 'Internal note' : 'Message'}
        className="min-h-[64px]"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
        }}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-muted hidden sm:block">Press ⌘/Ctrl + Enter to send</span>
        <Button size="sm" onClick={handleSend} disabled={!text.trim()} variant={isInternal ? 'secondary' : 'primary'}>
          <Send className="h-3.5 w-3.5" />
          {isInternal ? 'Add internal note' : 'Send message'}
        </Button>
      </div>
    </div>
  )
}
