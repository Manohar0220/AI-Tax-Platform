import { useState, useMemo } from 'react'
import { FilePlus2, MessageSquarePlus, StickyNote, Send } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import { Card } from '@/components/feedback'
import { Button, Textarea } from '@/components/forms'
import { Modal } from '@/components/feedback/Modal'
import { requestDocument, askClient, addInternalNote, submitForReview } from '@/services/preparer-service'

type Action = 'request' | 'ask' | 'note' | null

/**
 * Manual preparer actions for a return. Nothing runs automatically — a client
 * request, conversation, internal note, "waiting on client" status, or a
 * submit-for-review only happens when the preparer clicks an action here.
 */
export function PreparerActionsPanel({ returnId, viewerUserId }: { returnId: string; viewerUserId: string }) {
  const addToast = useToastStore((s) => s.addToast)
  const allDocuments = useDemoStore((s) => s.documents)
  const documents = useMemo(() => allDocuments.filter((d) => d.returnId === returnId), [allDocuments, returnId])

  const [action, setAction] = useState<Action>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [linkedDocumentId, setLinkedDocumentId] = useState('')
  const [text, setText] = useState('')

  const close = () => {
    setAction(null)
    setTitle(''); setDescription(''); setLinkedDocumentId(''); setText('')
  }

  const submitRequest = () => {
    if (!title.trim()) return
    requestDocument({
      returnId,
      byUserId: viewerUserId,
      title: title.trim(),
      description: description.trim() || 'Please upload the requested document.',
      linkedDocumentId: linkedDocumentId || undefined,
    })
    addToast({ message: 'Document request sent to the client.', type: 'success' })
    close()
  }

  const submitAsk = () => {
    if (!text.trim()) return
    askClient({ returnId, byUserId: viewerUserId, question: text.trim() })
    addToast({ message: 'Question sent to the client.', type: 'success' })
    close()
  }

  const submitNote = () => {
    if (!text.trim()) return
    addInternalNote(returnId, viewerUserId, text.trim())
    addToast({ message: 'Internal note added.', type: 'success' })
    close()
  }

  const handleSubmitForReview = () => {
    submitForReview(returnId, viewerUserId)
    addToast({ message: 'Return submitted for reviewer review.', type: 'success' })
  }

  return (
    <Card padding="md">
      <h2 className="text-sm font-semibold text-text-primary mb-1">Preparer actions</h2>
      <p className="text-xs text-text-muted mb-3">
        Choose an action. Requests and conversations are only created when you act.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setAction('request')}>
          <FilePlus2 className="h-3.5 w-3.5" /> Request document
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAction('ask')}>
          <MessageSquarePlus className="h-3.5 w-3.5" /> Ask client
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAction('note')}>
          <StickyNote className="h-3.5 w-3.5" /> Add internal note
        </Button>
        <Button size="sm" onClick={handleSubmitForReview}>
          <Send className="h-3.5 w-3.5" /> Submit for review
        </Button>
      </div>

      {/* Request document */}
      <Modal open={action === 'request'} onClose={close} title="Request a document" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-text-secondary">What do you need?</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Upload mortgage interest statement (1098)"
              className="mt-1 w-full px-3 py-1.5 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus"
            />
          </div>
          <Textarea
            label="Message to the client"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what you need and why."
          />
          <div>
            <label className="text-sm font-medium text-text-secondary">Link to a document (optional)</label>
            <select
              value={linkedDocumentId}
              onChange={(e) => setLinkedDocumentId(e.target.value)}
              className="mt-1 w-full px-2.5 py-2 text-sm rounded-md border border-border-default bg-surface-card"
            >
              <option value="">No specific document</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
            <Button size="sm" onClick={submitRequest} disabled={!title.trim()}>Send request</Button>
          </div>
        </div>
      </Modal>

      {/* Ask client */}
      <Modal open={action === 'ask'} onClose={close} title="Ask the client a question" size="sm">
        <Textarea
          label="Your question"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a clear, plain-language question."
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
          <Button size="sm" onClick={submitAsk} disabled={!text.trim()}>Send question</Button>
        </div>
      </Modal>

      {/* Internal note */}
      <Modal open={action === 'note'} onClose={close} title="Add an internal note" size="sm">
        <p className="text-xs text-text-muted mb-2">Only visible to the firm — never to the client.</p>
        <Textarea
          label="Note"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Record a note for the file."
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
          <Button size="sm" onClick={submitNote} disabled={!text.trim()}>Add note</Button>
        </div>
      </Modal>
    </Card>
  )
}
