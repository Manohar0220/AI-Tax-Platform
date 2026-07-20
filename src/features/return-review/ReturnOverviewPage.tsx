import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Calendar, User, Eye, AlertTriangle, FileWarning, History, ArrowRight, CircleDot, CheckCircle2,
} from 'lucide-react'
import { useDemoStore } from '@/store/demo-store'
import { useAuthStore } from '@/store/auth-store'
import { Card } from '@/components/feedback'
import { Badge } from '@/components/feedback/Badge'
import { Button } from '@/components/forms'
import { getReturnClientName, getNextResponsiblePerson } from '@/features/dashboard/dashboard-utils'
import { ReviewSummaryPanel } from '@/features/reviewer/ReviewSummaryPanel'
import { getChecklistForReturn, isRelevant } from '@/services/checklist-service'
import { StatusPanel } from '@/features/status/StatusPanel'
import { StageAdvancer } from '@/features/status/StageAdvancer'
import { FilingPanel } from './FilingPanel'

const STAGE_LABELS: Record<string, string> = {
  collecting_information: 'Collecting Information',
  waiting_on_client: 'Waiting on Client',
  ready_to_prepare: 'Ready for preparer review',
  preparing: 'Preparing',
  ready_for_review: 'Ready for Review',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  waiting_for_client_approval: 'Client Approval',
  ready_to_file: 'Ready to File',
  filed: 'Filed',
  filing_rejected: 'Filing Rejected',
}

const ROLE_LABELS: Record<string, string> = {
  tax_preparer: 'Tax Preparer',
  reviewer: 'Reviewer',
  individual_taxpayer: 'Client',
  business_owner: 'Client',
  firm_administrator: 'Administrator',
}

export function ReturnOverviewPage() {
  const { returnId } = useParams<{ returnId: string }>()
  const navigate = useNavigate()
  const activeRole = useAuthStore((s) => s.activeRole)
  const currentUser = useAuthStore((s) => s.currentUser)
  const returns = useDemoStore((s) => s.returns)
  const clients = useDemoStore((s) => s.clients)
  const users = useDemoStore((s) => s.users)
  const issues = useDemoStore((s) => s.issues)
  const documents = useDemoStore((s) => s.documents)
  const auditEvents = useDemoStore((s) => s.auditEvents)

  const ret = returns.find((r) => r.id === returnId)
  if (!ret) return <p className="text-sm text-text-muted">Return not found.</p>

  const clientName = getReturnClientName(ret, clients)
  const preparer = users.find((u) => u.id === ret.preparerId)
  const reviewer = users.find((u) => u.id === ret.reviewerId)
  const checklist = getChecklistForReturn(ret.id, clients, returns)
  const openIssues = issues.filter(
    (i) => i.returnId === ret.id && (i.status === 'open' || i.status === 'in_progress') && isRelevant(checklist.relevantIssueIds, i.id),
  )
  const missingDocs = documents.filter(
    (d) => d.returnId === ret.id && d.status === 'missing' && isRelevant(checklist.relevantDocIds, d.id),
  )
  const recentActivity = [...auditEvents]
    .filter((a) => a.returnId === ret.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6)

  const userName = (id: string) => users.find((u) => u.id === id)?.name || 'System'

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Reviewer summary (reviewers only) */}
      {activeRole === 'reviewer' && currentUser && (
        <ReviewSummaryPanel returnId={ret.id} viewerUserId={currentUser.id} />
      )}

      {/* Shared status system — staff audience — plus a validated stage control */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-4">
        <StatusPanel taxReturn={ret} audience="staff" />
        <StageAdvancer taxReturn={ret} />
      </div>

      {/* Filing (staff, when ready to file) */}
      <FilingPanel taxReturn={ret} />

      {/* Key facts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary">{clientName}</h2>
              <p className="text-sm text-text-muted mt-0.5">
                {ret.type === 'business' ? 'Business return' : 'Individual return'} · Tax year {ret.taxYear} · {ret.id}
              </p>
            </div>
            <Badge variant={ret.stage === 'filed' ? 'success' : 'primary'}>{STAGE_LABELS[ret.stage] || ret.stage}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
            <Fact icon={Calendar} label="Deadline" value={ret.deadline} />
            <Fact icon={User} label="Preparer" value={preparer?.name || '—'} />
            <Fact icon={Eye} label="Reviewer" value={reviewer?.name || '—'} />
          </div>

          <div className="mt-4 pt-4 border-t border-border-default">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Next action</p>
            <p className="text-sm text-text-primary">{ret.nextAction}</p>
            <p className="text-xs text-text-muted mt-1">
              Owner: {getNextResponsiblePerson(ret, users, clients)} ({ROLE_LABELS[ret.nextResponsibleRole] || ret.nextResponsibleRole})
            </p>
          </div>

          {ret.blocker && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-warning-50 border border-warning-500 text-sm text-warning-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span><span className="font-medium">Blocked:</span> {ret.blocker}</span>
            </div>
          )}
        </Card>

        {/* Primary workflow action */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Completion</p>
            <p className="text-3xl font-semibold text-text-primary">{ret.completionPercentage}%</p>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${ret.completionPercentage}%` }} />
            </div>
          </div>
          <Button className="mt-4" onClick={() => navigate(`/returns/${ret.id}/review`)}>
            Open review workspace
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion history */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-1.5 mb-3">
            <History className="h-4 w-4 text-text-muted" /> Completion history
          </h3>
          <ol className="space-y-3">
            {ret.stageHistory.map((h, i) => {
              const done = !!h.completedAt
              return (
                <li key={i} className="flex gap-2.5">
                  <div className="mt-0.5">
                    {done ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <CircleDot className="h-4 w-4 text-primary-500" />}
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">{STAGE_LABELS[h.stage] || h.stage}</p>
                    <p className="text-xs text-text-muted">
                      Entered {new Date(h.enteredAt).toLocaleDateString()}
                      {h.completedAt ? ` · completed ${new Date(h.completedAt).toLocaleDateString()} by ${userName(h.completedBy || '')}` : ' · in progress'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>

        {/* Recent activity */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-1.5 mb-3">
            <History className="h-4 w-4 text-text-muted" /> Recent activity
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-text-muted">No recorded activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="text-text-secondary">{a.details}</p>
                  <p className="text-xs text-text-muted">{userName(a.userId)} · {new Date(a.timestamp).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Open issues */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-1.5 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning-600" /> Open issues ({openIssues.length})
          </h3>
          {openIssues.length === 0 ? (
            <p className="text-sm text-text-muted">No open issues.</p>
          ) : (
            <ul className="space-y-2">
              {openIssues.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2">
                  <span className="text-sm text-text-secondary">{i.title}</span>
                  <Badge variant={i.priority === 'high' ? 'error' : i.priority === 'medium' ? 'warning' : 'default'}>{i.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Missing documents */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-1.5 mb-3">
            <FileWarning className="h-4 w-4 text-warning-600" /> Missing documents ({missingDocs.length})
          </h3>
          {missingDocs.length === 0 ? (
            <p className="text-sm text-text-muted">All requested documents received.</p>
          ) : (
            <ul className="space-y-1.5">
              {missingDocs.map((d) => (
                <li key={d.id} className="text-sm text-text-secondary">{d.name}</li>
              ))}
            </ul>
          )}
          <Link to={`/returns/${ret.id}/documents`} className="text-xs text-text-link hover:underline mt-3 inline-block">
            View all documents
          </Link>
        </Card>
      </div>
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="text-text-primary mt-0.5">{value}</p>
    </div>
  )
}
