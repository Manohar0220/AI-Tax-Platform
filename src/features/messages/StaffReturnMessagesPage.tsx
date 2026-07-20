import { useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { CollaborationView } from './CollaborationView'

export function StaffReturnMessagesPage() {
  const { returnId } = useParams<{ returnId: string }>()
  const currentUser = useAuthStore((s) => s.currentUser)
  const activeRole = useAuthStore((s) => s.activeRole)

  if (!returnId || !currentUser || !activeRole) {
    return <div className="p-6 text-sm text-text-muted">Return not found.</div>
  }

  return (
    <CollaborationView
      returnId={returnId}
      viewerRole={activeRole}
      viewerUserId={currentUser.id}
    />
  )
}
