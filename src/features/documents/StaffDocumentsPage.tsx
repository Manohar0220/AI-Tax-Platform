import { useState, useMemo, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, ExternalLink, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { useAuthStore } from '@/store/auth-store'
import { useDocsListStore, PAGE_SIZE } from '@/store/list-stores'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { EmptyState } from '@/components/status'
import { Drawer } from '@/components/feedback/Drawer'
import { PermissionGate } from '@/components/feedback/PermissionGate'
import { STATUS_LABELS, STATUS_VARIANTS } from '@/services/document-service'
import type { Document, DocumentStatus } from '@/domain/types'

const DOCUMENT_TYPES = ['All', 'W-2', '1099-INT', '1099-DIV', '1099-NEC', '1098', 'Receipt', 'Bank Statement', 'Invoice', 'Financial Statement', 'ID']
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'received', label: 'Received' },
  { value: 'verified', label: 'Accepted' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'needs_replacement', label: 'Needs Replacement' },
  { value: 'duplicate_warning', label: 'Possible Duplicate' },
  { value: 'missing', label: 'Needed' },
]

export function StaffDocumentsPage() {
  const documents = useDemoStore((s) => s.documents)
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const fields = useDemoStore((s) => s.fields)
  const activeRole = useAuthStore((s) => s.activeRole)

  const { values, page, scrollTop, set, setPage, setScroll, reset } = useDocsListStore()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const search = values.search
  const typeFilter = values.type
  const statusFilter = values.status

  // All staff see all documents.
  const scopedDocuments = documents

  // Client options limited to clients present in the (scoped) document set.
  const clientOptions = useMemo(() => {
    const ids = new Set(scopedDocuments.map((d) => returns.find((r) => r.id === d.returnId)?.clientId).filter(Boolean) as string[])
    return clients.filter((c) => ids.has(c.id))
  }, [scopedDocuments, returns, clients])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return scopedDocuments.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q) && !d.type.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false
      if (typeFilter !== 'All' && d.type !== typeFilter) return false
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (values.client !== 'all') {
        const ret = returns.find((r) => r.id === d.returnId)
        if (ret?.clientId !== values.client) return false
      }
      if (values.needsReview === 'yes' && d.status !== 'needs_review') return false
      if (values.duplicate === 'yes' && d.status !== 'duplicate_warning') return false
      return true
    })
  }, [scopedDocuments, search, typeFilter, statusFilter, values.client, values.needsReview, values.duplicate, returns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const restored = useRef(false)
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    if (main && !restored.current) { main.scrollTop = scrollTop; restored.current = true }
    return () => { const el = document.querySelector('main'); if (el) setScroll(el.scrollTop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getClientName = (returnId: string) => {
    const ret = returns.find((r) => r.id === returnId)
    if (!ret) return returnId
    const client = clients.find((c) => c.id === ret.clientId)
    return client?.businessName || client?.name || ret.clientId
  }

  const relatedFields = selectedDoc
    ? fields.filter((f) => f.sources.some((s) => s.documentId === selectedDoc.id))
    : []

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Documents</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {scopedDocuments.length} total across all returns
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, type, or ID..."
            value={search}
            onChange={(e) => set('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border-default bg-surface-card focus:outline-2 focus:outline-border-focus"
            aria-label="Search documents"
          />
        </div>
        <select aria-label="Type" value={typeFilter} onChange={(e) => set('type', e.target.value)} className="px-3 py-2 text-sm rounded-md border border-border-default bg-surface-card">
          {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Status" value={statusFilter} onChange={(e) => set('status', e.target.value)} className="px-3 py-2 text-sm rounded-md border border-border-default bg-surface-card">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="Client" value={values.client} onChange={(e) => set('client', e.target.value)} className="px-3 py-2 text-sm rounded-md border border-border-default bg-surface-card">
          <option value="all">All clients</option>
          {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.businessName || c.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 px-2 text-sm text-text-secondary">
          <input type="checkbox" checked={values.needsReview === 'yes'} onChange={(e) => set('needsReview', e.target.checked ? 'yes' : 'no')} className="accent-primary-600" /> Needs review
        </label>
        <label className="flex items-center gap-1.5 px-2 text-sm text-text-secondary">
          <input type="checkbox" checked={values.duplicate === 'yes'} onChange={(e) => set('duplicate', e.target.checked ? 'yes' : 'no')} className="accent-primary-600" /> Duplicates
        </label>
        <button onClick={reset} className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-text-link hover:underline">
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <p className="text-xs text-text-muted mb-2">{filtered.length} document{filtered.length === 1 ? '' : 's'} match</p>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No documents match"
          description="Try adjusting your search or filters."
          icon={<FileText className="h-12 w-12" />}
        />
      ) : (
        <>
          <div className="space-y-1">
            {pageItems.map((doc) => (
              <button key={doc.id} onClick={() => setSelectedDoc(doc)} className="w-full text-left">
                <Card padding="sm" className="hover:border-border-strong transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-neutral-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
                      <p className="text-xs text-text-muted truncate">{getClientName(doc.returnId)} — {doc.type}</p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[doc.status] || 'default'}>
                      {STATUS_LABELS[doc.status] || doc.status}
                    </Badge>
                  </div>
                </Card>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-text-muted">Page {safePage} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages} className="p-1.5 rounded-md border border-border-default text-text-muted hover:bg-neutral-50 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}

      {/* Document detail drawer */}
      <Drawer
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Document Details"
      >
        {selectedDoc && (
          <DocumentDetail
            doc={selectedDoc}
            clientName={getClientName(selectedDoc.returnId)}
            relatedFields={relatedFields}
            activeRole={activeRole}
            onStatusChange={(status) => {
              const state = useDemoStore.getState()
              const docs = state.documents.map((d) =>
                d.id === selectedDoc.id ? { ...d, status } : d
              )
              state.updateState({ documents: docs })
              setSelectedDoc({ ...selectedDoc, status })
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function DocumentDetail({
  doc,
  clientName,
  relatedFields,
  activeRole,
  onStatusChange,
}: {
  doc: Document
  clientName: string
  relatedFields: { id: string; label: string; formattedValue: string }[]
  activeRole: string | null
  onStatusChange: (status: DocumentStatus) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium text-text-primary">{doc.name}</h3>
        <p className="text-sm text-text-muted mt-0.5">{clientName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-text-muted text-xs">Type</p>
          <p className="text-text-primary">{doc.type}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Status</p>
          <Badge variant={STATUS_VARIANTS[doc.status] || 'default'}>
            {STATUS_LABELS[doc.status] || doc.status}
          </Badge>
        </div>
        <div>
          <p className="text-text-muted text-xs">Pages</p>
          <p className="text-text-primary">{doc.pageCount || '—'}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">File Size</p>
          <p className="text-text-primary">{doc.fileSize || '—'}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Uploaded</p>
          <p className="text-text-primary">
            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Return ID</p>
          <p className="text-text-primary">{doc.returnId}</p>
        </div>
      </div>

      {doc.notes && (
        <div className="p-3 bg-neutral-50 rounded-md">
          <p className="text-xs text-text-muted mb-1">Notes</p>
          <p className="text-sm text-text-secondary">{doc.notes}</p>
        </div>
      )}

      {relatedFields.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Related return fields</p>
          <div className="space-y-1">
            {relatedFields.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded text-sm">
                <span className="text-text-secondary">{f.label}</span>
                <span className="font-medium text-text-primary">{f.formattedValue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff actions */}
      <PermissionGate allowedRoles={['tax_preparer', 'reviewer']} fallback="hide">
        <div className="border-t border-border-default pt-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Actions</p>
          <div className="space-y-2">
            <PermissionGate allowedRoles={['tax_preparer']} fallback="disable" disabledReason="Only preparers can classify documents.">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => onStatusChange('verified')}>
                  Mark as accepted
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onStatusChange('needs_replacement')}>
                  Needs replacement
                </Button>
              </div>
            </PermissionGate>

            <PermissionGate allowedRoles={['tax_preparer', 'reviewer']} fallback="hide">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/returns/${doc.returnId}/documents`)}>
                <ExternalLink className="h-3.5 w-3.5" />
                Open in return
              </Button>
            </PermissionGate>
          </div>
        </div>
      </PermissionGate>

      <div className="text-xs text-text-muted">
        Document ID: {doc.id}
      </div>

      {void activeRole}
    </div>
  )
}
