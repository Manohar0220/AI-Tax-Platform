import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { ReturnLayout } from '@/components/layout/ReturnLayout'
import { AuthInitializer } from './AuthInitializer'
import { LoginPage } from '@/features/auth-demo/LoginPage'
import { AuthGuard } from '@/routes/AuthGuard'
import { RoleGuard } from '@/routes/RoleGuard'
import { DashboardPage } from '@/routes/DashboardPage'
import { useAuthStore } from '@/store/auth-store'
import { IndividualOnboardingPage } from '@/features/clients/IndividualOnboardingPage'
import { BusinessOnboardingPage } from '@/features/clients/BusinessOnboardingPage'
import { AdminPage } from '@/routes/AdminPage'
import { ReturnsListPage } from '@/routes/ReturnsListPage'
import { PlaceholderPage } from '@/routes/PlaceholderPage'
import { ClientHomePage } from '@/features/clients/ClientHomePage'
import { ClientReturnPage } from '@/features/clients/ClientReturnPage'
import { EquipmentExplainPage } from '@/features/clients/EquipmentExplainPage'
import { TasksPage } from '@/features/tasks/TasksPage'

/** Routes business owners to the business onboarding wizard; individual taxpayers to theirs. */
function OnboardingRouter() {
  const activeRole = useAuthStore((s) => s.activeRole)
  return activeRole === 'business_owner' ? <BusinessOnboardingPage /> : <IndividualOnboardingPage />
}
import { TeamPage } from '@/features/administration/TeamPage'
import { AssignmentsPage } from '@/features/administration/AssignmentsPage'
import { WorkloadPage } from '@/features/administration/WorkloadPage'
import { DeadlinesPage } from '@/features/administration/DeadlinesPage'
import { PermissionsPage } from '@/features/administration/PermissionsPage'
import { ClientDocumentsPage } from '@/features/documents/ClientDocumentsPage'
import { StaffDocumentsPage } from '@/features/documents/StaffDocumentsPage'
import { ReturnDocumentsPage } from '@/features/documents/ReturnDocumentsPage'
import { ClientQuestionsPage } from '@/features/questionnaires/ClientQuestionsPage'
import { ClientMessagesPage } from '@/features/messages/ClientMessagesPage'
import { StaffReturnMessagesPage } from '@/features/messages/StaffReturnMessagesPage'
import { ReturnOverviewPage } from '@/features/return-review/ReturnOverviewPage'
import { ReturnReviewPage } from '@/features/return-review/ReturnReviewPage'
import { ReviewQueuePage } from '@/features/reviewer/ReviewQueuePage'
import { TraceabilityPage } from '@/features/traceability/TraceabilityPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthInitializer>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <AuthGuard>
                    <AppLayout />
                  </AuthGuard>
                }
              >
                {/* Client routes */}
                <Route path="/my-return" element={
                  <RoleGuard allowedRoles={['individual_taxpayer', 'business_owner']}>
                    <ClientHomePage />
                  </RoleGuard>
                } />
                <Route path="/my-return/details" element={
                  <RoleGuard allowedRoles={['individual_taxpayer', 'business_owner']}>
                    <ClientReturnPage />
                  </RoleGuard>
                } />
                <Route path="/my-return/documents" element={
                  <RoleGuard allowedRoles={['individual_taxpayer', 'business_owner']}>
                    <ClientDocumentsPage />
                  </RoleGuard>
                } />
                <Route path="/my-return/questions" element={
                  <RoleGuard allowedRoles={['individual_taxpayer', 'business_owner']}>
                    <ClientQuestionsPage />
                  </RoleGuard>
                } />
                <Route path="/my-return/onboarding" element={
                  <RoleGuard allowedRoles={['individual_taxpayer', 'business_owner']}>
                    <OnboardingRouter />
                  </RoleGuard>
                } />
                <Route path="/my-return/messages" element={
                  <RoleGuard allowedRoles={['individual_taxpayer', 'business_owner']}>
                    <ClientMessagesPage />
                  </RoleGuard>
                } />
                <Route path="/my-return/equipment" element={
                  <RoleGuard allowedRoles={['business_owner']}>
                    <EquipmentExplainPage />
                  </RoleGuard>
                } />

                {/* Staff dashboard */}
                <Route path="/dashboard" element={
                  <RoleGuard allowedRoles={['tax_preparer', 'reviewer']}>
                    <DashboardPage />
                  </RoleGuard>
                } />
                <Route path="/firm/dashboard" element={
                  <RoleGuard allowedRoles={['tax_preparer', 'reviewer']}>
                    <DashboardPage />
                  </RoleGuard>
                } />

                {/* Returns - staff */}
                <Route path="/returns" element={
                  <RoleGuard allowedRoles={['tax_preparer', 'reviewer', 'firm_administrator']}>
                    <ReturnsListPage />
                  </RoleGuard>
                } />

                {/* Return detail with context nav */}
                <Route path="/returns/:returnId" element={
                  <RoleGuard allowedRoles={['tax_preparer', 'reviewer', 'firm_administrator']}>
                    <ReturnLayout />
                  </RoleGuard>
                }>
                  <Route index element={<ReturnOverviewPage />} />
                  <Route path="review" element={<ReturnReviewPage />} />
                  <Route path="trace" element={<TraceabilityPage />} />
                  {/* AI recommendations now live inside the Review tab; redirect the old path. */}
                  <Route path="ai" element={<Navigate to="review" replace />} />
                  <Route path="documents" element={<ReturnDocumentsPage />} />
                  <Route path="issues" element={<PlaceholderPage title="Issues" description="Open issues and blockers." />} />
                  <Route path="tasks" element={<PlaceholderPage title="Tasks" description="Tasks related to this return." />} />
                  <Route path="messages" element={<StaffReturnMessagesPage />} />
                  <Route path="activity" element={<PlaceholderPage title="Activity" description="Audit log and activity history." />} />
                </Route>

                {/* Clients */}
                <Route path="/clients" element={
                  <RoleGuard allowedRoles={['tax_preparer']}>
                    <PlaceholderPage title="Clients" description="Manage your assigned clients." />
                  </RoleGuard>
                } />

                {/* Tasks */}
                <Route path="/tasks" element={
                  <RoleGuard allowedRoles={['tax_preparer']}>
                    <TasksPage />
                  </RoleGuard>
                } />

                {/* Documents - staff */}
                <Route path="/documents" element={
                  <RoleGuard allowedRoles={['tax_preparer', 'reviewer', 'firm_administrator']}>
                    <StaffDocumentsPage />
                  </RoleGuard>
                } />
                <Route path="/review-queue" element={
                  <RoleGuard allowedRoles={['reviewer']}>
                    <ReviewQueuePage />
                  </RoleGuard>
                } />
                <Route path="/reviewer/queue" element={
                  <RoleGuard allowedRoles={['reviewer']}>
                    <ReviewQueuePage />
                  </RoleGuard>
                } />
                <Route path="/issues" element={
                  <RoleGuard allowedRoles={['reviewer']}>
                    <PlaceholderPage title="Issues" description="All open issues across returns." />
                  </RoleGuard>
                } />

                {/* Admin routes */}
                <Route path="/admin" element={
                  <RoleGuard allowedRoles={['firm_administrator']}>
                    <AdminPage />
                  </RoleGuard>
                } />
                <Route path="/admin/team" element={
                  <RoleGuard allowedRoles={['firm_administrator']}>
                    <TeamPage />
                  </RoleGuard>
                } />
                <Route path="/admin/assignments" element={
                  <RoleGuard allowedRoles={['firm_administrator']}>
                    <AssignmentsPage />
                  </RoleGuard>
                } />
                <Route path="/admin/workload" element={
                  <RoleGuard allowedRoles={['firm_administrator']}>
                    <WorkloadPage />
                  </RoleGuard>
                } />
                <Route path="/admin/deadlines" element={
                  <RoleGuard allowedRoles={['firm_administrator']}>
                    <DeadlinesPage />
                  </RoleGuard>
                } />
                <Route path="/admin/permissions" element={
                  <RoleGuard allowedRoles={['firm_administrator']}>
                    <PermissionsPage />
                  </RoleGuard>
                } />

                {/* Help */}
                <Route path="/help" element={
                  <PlaceholderPage title="Help &amp; Support" description="Get help with the platform." />
                } />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthInitializer>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
