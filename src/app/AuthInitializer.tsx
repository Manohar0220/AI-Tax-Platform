import { useEffect, useState } from 'react'
import { DEMO_USERS } from '@/data/users'
import { useAuthStore, getPersistedAuth } from '@/store/auth-store'
import { useOnboardingStore } from '@/store/onboarding-store'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const login = useAuthStore((s) => s.login)
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loadForUser = useOnboardingStore((s) => s.loadForUser)

  useEffect(() => {
    if (!isAuthenticated) {
      const persisted = getPersistedAuth()
      if (persisted) {
        const user = DEMO_USERS.find((u) => u.id === persisted.userId)
        if (user) {
          login(user)
          loadForUser(user.id)
          if (persisted.activeWorkspace === 'personal') {
            switchWorkspace('personal')
          }
        }
      }
    }
    setReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null
  return <>{children}</>
}
