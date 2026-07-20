import { useNavigate } from 'react-router-dom'
import {
  User,
  Briefcase,
  FileText,
  Shield,
  Settings,
} from 'lucide-react'
import { DEMO_USERS } from '@/data/users'
import { useAuthStore, getHomeRouteForRole } from '@/store/auth-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { useToastStore } from '@/store/toast-store'
import { Button } from '@/components/forms'
import { Card } from '@/components/feedback'
import type { Role } from '@/domain/types'

const ROLE_META: Record<Role, { icon: typeof User; description: string; color: string }> = {
  individual_taxpayer: {
    icon: User,
    description: 'Upload documents, answer questions, and track your return.',
    color: 'text-primary-600',
  },
  business_owner: {
    icon: Briefcase,
    description: 'Manage business tax documents and communicate with your preparer.',
    color: 'text-primary-700',
  },
  tax_preparer: {
    icon: FileText,
    description: 'Prepare returns, verify AI extractions, and manage client work.',
    color: 'text-success-600',
  },
  reviewer: {
    icon: Shield,
    description: 'Review completed returns, check calculations, and approve filings.',
    color: 'text-ai-600',
  },
  firm_administrator: {
    icon: Settings,
    description: 'Manage staff assignments, deadlines, and firm-wide settings.',
    color: 'text-warning-600',
  },
}

const ROLE_LABELS: Record<Role, string> = {
  individual_taxpayer: 'Individual Taxpayer',
  business_owner: 'Business Owner',
  tax_preparer: 'Tax Preparer',
  reviewer: 'Reviewer',
  firm_administrator: 'Firm Administrator',
}

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loadForUser = useOnboardingStore((s) => s.loadForUser)
  const addToast = useToastStore((s) => s.addToast)

  const handleLogin = (userId: string) => {
    const user = DEMO_USERS.find((u) => u.id === userId)
    if (!user) return

    login(user)
    loadForUser(user.id)
    addToast({
      message: `Signed in as ${user.name}. This is a simulated demo login.`,
      type: 'info',
      duration: 5000,
    })
    navigate(getHomeRouteForRole(user.primaryRole))
  }

  return (
    <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            AI Tax Platform
          </h1>
          <p className="text-text-secondary">
            Select a demo account to explore the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_USERS.map((user) => {
            const meta = ROLE_META[user.primaryRole]
            const Icon = meta.icon
            const roleLabel = ROLE_LABELS[user.primaryRole]

            return (
              <Card key={user.id} padding="lg" className="flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-neutral-50 ${meta.color}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-medium text-text-primary">
                      {user.name}
                    </h2>
                    <p className="text-sm text-text-muted">{roleLabel}</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary mb-4 flex-1">
                  {meta.description}
                </p>
                {user.roles.length > 1 && (
                  <p className="text-xs text-ai-600 mb-3">
                    Also has a personal return (dual role)
                  </p>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleLogin(user.id)}
                >
                  Continue as {user.name.split(' ')[0]}
                </Button>
              </Card>
            )
          })}
        </div>

        <p className="text-center text-xs text-text-muted mt-8">
          No password required. All data is fictional and stored locally in your browser.
        </p>
      </div>
    </div>
  )
}
