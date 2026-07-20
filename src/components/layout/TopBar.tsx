import { useState, useEffect } from 'react'
import { Search, Menu, RotateCcw } from 'lucide-react'
import { WorkspaceSwitcher } from '@/components/navigation/WorkspaceSwitcher'
import { NotificationsMenu } from '@/features/notifications/NotificationsMenu'
import { useAuthStore } from '@/store/auth-store'
import { useDemoStore } from '@/store/demo-store'
import { useToastStore } from '@/store/toast-store'
import { Tooltip } from '@/components/feedback/Tooltip'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { GlobalSearch } from '@/features/search/GlobalSearch'

interface TopBarProps {
  onMenuToggle: () => void
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const reset = useDemoStore((s) => s.reset)
  const addToast = useToastStore((s) => s.addToast)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!isAuthenticated) return null

  const handleReset = () => {
    reset()
    setShowResetConfirm(false)
    addToast({ message: 'Demo data has been reset to its initial state.', type: 'success' })
  }

  return (
    <>
      <header className="h-14 border-b border-border-default bg-surface-card flex items-center justify-between px-3 md:px-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-md text-text-muted hover:bg-neutral-100 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-base font-semibold text-text-primary hidden sm:block">
            AI Tax Platform
          </span>
          <span className="text-base font-semibold text-text-primary sm:hidden">
            AI Tax
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip content="Search (⌘/Ctrl + K)">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-md text-text-muted hover:bg-neutral-100"
              aria-label="Global search"
            >
              <Search className="h-5 w-5" />
            </button>
          </Tooltip>

          <NotificationsMenu />

          <Tooltip content="Reset demo data">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-2 rounded-md text-text-muted hover:bg-neutral-100"
              aria-label="Reset demo data"
            >
              <RotateCcw className="h-4.5 w-4.5" />
            </button>
          </Tooltip>

          <div className="ml-1 pl-2 border-l border-border-default">
            <WorkspaceSwitcher />
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset demo data?"
        message="This will restore all data to its original state. Any changes you've made during this session will be lost."
        confirmLabel="Reset"
        variant="danger"
      />

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
