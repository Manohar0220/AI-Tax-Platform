import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from '@/components/navigation/Sidebar'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'
import { ToastContainer } from '@/components/feedback/Toast'
import { useToastStore } from '@/store/toast-store'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const toasts = useToastStore((s) => s.toasts)
  const dismissToast = useToastStore((s) => s.dismissToast)

  return (
    <div className="min-h-screen flex flex-col bg-surface-page">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <ToastContainer
        toasts={toasts.map((t) => ({ ...t, onDismiss: dismissToast }))}
        onDismiss={dismissToast}
      />
    </div>
  )
}
