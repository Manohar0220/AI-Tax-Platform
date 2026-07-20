import type { Role } from '@/domain/types'
import type { LucideIcon } from 'lucide-react'
import {
  Home,
  FileText,
  FolderOpen,
  HelpCircle,
  MessageSquare,
  LayoutDashboard,
  Users,
  CheckSquare,
  ClipboardList,
  AlertTriangle,
  Building2,
  UserCog,
  CalendarClock,
  BarChart3,
  Search,
  Eye,
  MessagesSquare,
  Activity,
  ListChecks,
  ShieldCheck,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
}

export interface ReturnNavItem {
  id: string
  label: string
  segment: string
  icon: LucideIcon
}

const CLIENT_NAV_SETUP: NavItem[] = [
  { id: 'home', label: 'Get started', path: '/my-return', icon: Home },
  { id: 'help', label: 'Help', path: '/help', icon: HelpCircle },
]

const CLIENT_NAV: NavItem[] = [
  { id: 'home', label: 'Home', path: '/my-return', icon: Home },
  { id: 'return', label: 'My Return', path: '/my-return/details', icon: FileText },
  { id: 'documents', label: 'Documents', path: '/my-return/documents', icon: FolderOpen },
  { id: 'questions', label: 'Questions', path: '/my-return/questions', icon: ClipboardList },
  { id: 'messages', label: 'Messages', path: '/my-return/messages', icon: MessageSquare },
  { id: 'help', label: 'Help', path: '/help', icon: HelpCircle },
]

const BUSINESS_NAV: NavItem[] = [
  { id: 'home', label: 'Home', path: '/my-return', icon: Home },
  { id: 'return', label: 'Business Return', path: '/my-return/details', icon: FileText },
  { id: 'documents', label: 'Documents', path: '/my-return/documents', icon: FolderOpen },
  { id: 'questions', label: 'Questions', path: '/my-return/questions', icon: ClipboardList },
  { id: 'messages', label: 'Messages', path: '/my-return/messages', icon: MessageSquare },
  { id: 'help', label: 'Help', path: '/help', icon: HelpCircle },
]

const PREPARER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'returns', label: 'Returns', path: '/returns', icon: FileText },
  { id: 'clients', label: 'Clients', path: '/clients', icon: Users },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { id: 'documents', label: 'Documents', path: '/documents', icon: FolderOpen },
]

const REVIEWER_NAV: NavItem[] = [
  { id: 'review-queue', label: 'Review Queue', path: '/review-queue', icon: Eye },
  { id: 'returns', label: 'Returns', path: '/returns', icon: FileText },
  { id: 'issues', label: 'Issues', path: '/issues', icon: AlertTriangle },
  { id: 'documents', label: 'Documents', path: '/documents', icon: FolderOpen },
]

const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Firm Overview', path: '/admin', icon: Building2 },
  { id: 'team', label: 'Team', path: '/admin/team', icon: UserCog },
  { id: 'assignments', label: 'Assignments', path: '/admin/assignments', icon: ListChecks },
  { id: 'workload', label: 'Workload', path: '/admin/workload', icon: BarChart3 },
  { id: 'deadlines', label: 'Deadlines', path: '/admin/deadlines', icon: CalendarClock },
  { id: 'permissions', label: 'Permissions', path: '/admin/permissions', icon: ShieldCheck },
]

export const RETURN_CONTEXT_NAV: ReturnNavItem[] = [
  { id: 'overview', label: 'Overview', segment: '', icon: Eye },
  { id: 'review', label: 'Review', segment: 'review', icon: ClipboardList },
  { id: 'trace', label: 'Trace', segment: 'trace', icon: Search },
  { id: 'documents', label: 'Documents', segment: 'documents', icon: FolderOpen },
  { id: 'issues', label: 'Issues', segment: 'issues', icon: AlertTriangle },
  { id: 'tasks', label: 'Tasks', segment: 'tasks', icon: CheckSquare },
  { id: 'messages', label: 'Messages', segment: 'messages', icon: MessagesSquare },
  { id: 'activity', label: 'Activity', segment: 'activity', icon: Activity },
]

export { CLIENT_NAV_SETUP }

export function getNavForRole(role: Role, onboardingCompleted = true): NavItem[] {
  switch (role) {
    case 'individual_taxpayer':
      return onboardingCompleted ? CLIENT_NAV : CLIENT_NAV_SETUP
    case 'business_owner':
      return onboardingCompleted ? BUSINESS_NAV : CLIENT_NAV_SETUP
    case 'tax_preparer':
      return PREPARER_NAV
    case 'reviewer':
      return REVIEWER_NAV
    case 'firm_administrator':
      return ADMIN_NAV
    default:
      return []
  }
}

export function getAllowedPrefixes(role: Role): string[] {
  switch (role) {
    case 'individual_taxpayer':
      return ['/my-return', '/help']
    case 'business_owner':
      return ['/my-return', '/help']
    case 'tax_preparer':
      return ['/dashboard', '/returns', '/clients', '/tasks', '/documents', '/help']
    case 'reviewer':
      return ['/review-queue', '/returns', '/issues', '/documents', '/help']
    case 'firm_administrator':
      return ['/admin', '/returns', '/documents', '/help']
    default:
      return []
  }
}
