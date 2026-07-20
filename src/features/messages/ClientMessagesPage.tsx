import { MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { Card } from '@/components/feedback'
import { EmptyState } from '@/components/status'
import { filterThreadsForRole } from '@/services/collaboration-service'
import { CollaborationView } from './CollaborationView'

export function ClientMessagesPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const activeRole = useAuthStore((s) => s.activeRole)
  const clients = useDemoStore((s) => s.clients)
  const returns = useDemoStore((s) => s.returns)
  const threads = useDemoStore((s) => s.threads)
  const onboardingCompleted = useOnboardingStore((s) => s.completed)

  const client = clients.find((c) => c.userId === currentUser?.id)
  const taxReturn = returns.find((r) => r.clientId === client?.id)

  if (!client || !taxReturn || !currentUser || !activeRole) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Card padding="lg" className="text-center">
          <p className="text-text-muted">No conversations found for your account.</p>
        </Card>
      </div>
    )
  }

  // After onboarding: check if the preparer has actually started any conversations.
  if (onboardingCompleted) {
    const visibleThreads = filterThreadsForRole(threads, activeRole, taxReturn.id)
    if (visibleThreads.length === 0) {
      return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Messages</h1>
          </div>
          <EmptyState
            title="No conversations yet"
            description="Your tax preparer will start a conversation with you when they need something."
            icon={<MessageSquare className="h-12 w-12" />}
          />
        </div>
      )
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <CollaborationView
        returnId={taxReturn.id}
        viewerRole={activeRole}
        viewerUserId={currentUser.id}
        clientId={client.id}
      />
    </div>
  )
}
