import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PageSkeleton } from './components/ui/page-skeleton'

// Layouts
import { DashboardLayout } from './components/layout/dashboard-layout'
import { ClientLayout } from './components/layout/client-layout'
import { EmployeeLayout } from './components/layout/employee-layout'

// Global Pages
const LoginPage = lazy(() => import('./pages/auth/login').then(m => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/forgot-password').then(m => ({ default: m.ForgotPasswordPage })))
const PublicLeadForm = lazy(() => import('./pages/public/lead-form').then(m => ({ default: m.PublicLeadForm })))
const PublicQuotationView = lazy(() => import('./pages/public/quotation-view'))

// Dashboard Pages
const DashboardPage = lazy(() => import('./pages/dashboard').then(m => ({ default: m.DashboardPage })))
const AttendancePage = lazy(() => import('./pages/attendance').then(m => ({ default: m.AttendancePage })))
const LeadsPage = lazy(() => import('./pages/leads').then(m => ({ default: m.LeadsPage })))
const ClientsPage = lazy(() => import('./pages/clients').then(m => ({ default: m.ClientsPage })))
const NewClientPage = lazy(() => import('./pages/clients/new').then(m => ({ default: m.NewClientPage })))
const ClientDetailPage = lazy(() => import('./pages/clients/[id]').then(m => ({ default: m.ClientDetailPage })))
const EditClientPage = lazy(() => import('./pages/clients/edit').then(m => ({ default: m.EditClientPage })))

const ProjectsPage = lazy(() => import('./pages/projects').then(m => ({ default: m.ProjectsPage })))
const NewProjectPage = lazy(() => import('./pages/projects/new').then(m => ({ default: m.NewProjectPage })))
const ProjectDetailPage = lazy(() => import('./pages/projects/[id]').then(m => ({ default: m.ProjectDetailPage })))
const EditProjectPage = lazy(() => import('./pages/projects/edit').then(m => ({ default: m.EditProjectPage })))

const TasksPage = lazy(() => import('./pages/tasks').then(m => ({ default: m.TasksPage })))
const TaskDetailPage = lazy(() => import('./pages/tasks/[id]').then(m => ({ default: m.TaskDetailPage })))

const TeamPage = lazy(() => import('./pages/team').then(m => ({ default: m.TeamPage })))
const TeamMemberPage = lazy(() => import('./pages/team/[id]').then(m => ({ default: m.TeamMemberPage })))

const TimePage = lazy(() => import('./pages/time').then(m => ({ default: m.TimePage })))
const TimeReportsPage = lazy(() => import('./pages/time/reports').then(m => ({ default: m.TimeReportsPage })))

const InvoicesPage = lazy(() => import('./pages/invoices').then(m => ({ default: m.InvoicesPage })))
const NewInvoicePage = lazy(() => import('./pages/invoices/new').then(m => ({ default: m.NewInvoicePage })))
const InvoiceDetailPage = lazy(() => import('./pages/invoices/[id]').then(m => ({ default: m.InvoiceDetailPage })))
const ExpensesPage = lazy(() => import('./pages/expenses').then(m => ({ default: m.ExpensesPage })))
const SalaryPage = lazy(() => import('./pages/salary').then(m => ({ default: m.SalaryPage })))
const AmcPage = lazy(() => import('./pages/amc'))
const DomainsPage = lazy(() => import('./pages/domains'))
const HostingPage = lazy(() => import('./pages/hosting'))
const ExpiryAlertsPage = lazy(() => import('./pages/expiry-alerts'))

const TicketsPage = lazy(() => import('./pages/tickets').then(m => ({ default: m.TicketsPage })))
const ChatPage = lazy(() => import('./pages/chat').then(m => ({ default: m.ChatPage })))
const ProjectChatPage = lazy(() => import('./pages/chat/project-chat').then(m => ({ default: m.ProjectChatPage })))
const ChatWidgetsPage = lazy(() => import('./pages/chat/widgets').then(m => ({ default: m.ChatWidgetsPage })))
const UserTrackerPage = lazy(() => import('./pages/user-tracker'))
const ScreenMonitoringPage = lazy(() => import('./pages/screen-monitoring'))
const ReportsPage = lazy(() => import('./pages/reports').then(m => ({ default: m.ReportsPage })))

const FilesPage = lazy(() => import('./pages/files').then(m => ({ default: m.FilesPage })))
const SettingsPage = lazy(() => import('./pages/settings').then(m => ({ default: m.SettingsPage })))
const RolesPermissionsPage = lazy(() => import('./pages/settings/roles-permissions').then(m => ({ default: m.RolesPermissionsPage })))
const AIAssistantPage = lazy(() => import('./pages/ai-assistant'))

const QuotationsPage = lazy(() => import('./pages/quotations'))
const QuotationEditor = lazy(() => import('./pages/quotations/create'))
const QuotationDetailPage = lazy(() => import('./pages/quotations/[id]'))
const EmployeeDashboardPage = lazy(() => import('./pages/employee-dashboard').then(m => ({ default: m.EmployeeDashboardPage })))
const EmployeeSettingsPage = lazy(() => import('./pages/employee-settings').then(m => ({ default: m.EmployeeSettingsPage })))

import { usePermissions } from './hooks/use-permissions'
import { useAppStore } from './store'

function PermissionGuard({ module, children }: { module: string; children: React.ReactNode }) {
    const { canView, loading } = usePermissions()
    const { currentUser } = useAppStore()

    if (loading) {
        return <PageSkeleton />
    }

    if (!canView(module)) {
        if (currentUser?.role === 'client') {
            return <Navigate to="/client/dashboard" replace />
        }
        if (currentUser?.role === 'employee' || currentUser?.role === 'developer' || currentUser?.role === 'pm') {
            return <Navigate to="/employee/dashboard" replace />
        }
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

export function AppRoutes() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/f/:id" element={<PublicLeadForm />} />
                <Route path="/q/:id" element={<PublicQuotationView />} />


                {/* Dashboard Routes */}
                <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />

                    {/* Core Functionality */}
                    <Route path="attendance" element={<PermissionGuard module="attendance"><AttendancePage /></PermissionGuard>} />
                    <Route path="leads" element={<PermissionGuard module="leads"><LeadsPage /></PermissionGuard>} />
                    <Route path="clients" element={<PermissionGuard module="clients"><ClientsPage /></PermissionGuard>} />
                    <Route path="clients/new" element={<PermissionGuard module="clients"><NewClientPage /></PermissionGuard>} />
                    <Route path="clients/:id" element={<PermissionGuard module="clients"><ClientDetailPage /></PermissionGuard>} />
                    <Route path="clients/:id/edit" element={<PermissionGuard module="clients"><EditClientPage /></PermissionGuard>} />

                    <Route path="projects" element={<PermissionGuard module="projects"><ProjectsPage /></PermissionGuard>} />
                    <Route path="projects/new" element={<PermissionGuard module="projects"><NewProjectPage /></PermissionGuard>} />
                    <Route path="projects/:id" element={<PermissionGuard module="projects"><ProjectDetailPage /></PermissionGuard>} />
                    <Route path="projects/:id/edit" element={<PermissionGuard module="projects"><EditProjectPage /></PermissionGuard>} />

                    <Route path="tasks" element={<PermissionGuard module="tasks"><TasksPage /></PermissionGuard>} />
                    <Route path="tasks/:id" element={<PermissionGuard module="tasks"><TaskDetailPage /></PermissionGuard>} />

                    {/* Operations */}
                    <Route path="team" element={<PermissionGuard module="team"><TeamPage /></PermissionGuard>} />
                    <Route path="team/:id" element={<PermissionGuard module="team"><TeamMemberPage /></PermissionGuard>} />

                    <Route path="time" element={<PermissionGuard module="time_tracking"><TimePage /></PermissionGuard>} />
                    <Route path="time/reports" element={<PermissionGuard module="time_tracking"><TimeReportsPage /></PermissionGuard>} />

                    {/* Finance */}
                    <Route path="invoices" element={<PermissionGuard module="invoices"><InvoicesPage /></PermissionGuard>} />
                    <Route path="invoices/new" element={<PermissionGuard module="invoices"><NewInvoicePage /></PermissionGuard>} />
                    <Route path="invoices/:id" element={<PermissionGuard module="invoices"><InvoiceDetailPage /></PermissionGuard>} />
                    <Route path="expenses" element={<PermissionGuard module="expenses"><ExpensesPage /></PermissionGuard>} />
                    <Route path="salary" element={<PermissionGuard module="payroll"><SalaryPage /></PermissionGuard>} />
                    <Route path="amc" element={<PermissionGuard module="amc"><AmcPage /></PermissionGuard>} />
                    <Route path="domains" element={<PermissionGuard module="domains"><DomainsPage /></PermissionGuard>} />
                    <Route path="hosting" element={<PermissionGuard module="hosting"><HostingPage /></PermissionGuard>} />
                    <Route path="expiry-alerts" element={<PermissionGuard module="expiry_alerts"><ExpiryAlertsPage /></PermissionGuard>} />

                    {/* Support & Analysis */}
                    <Route path="tickets" element={<PermissionGuard module="tickets"><TicketsPage /></PermissionGuard>} />
                    <Route path="chat" element={<PermissionGuard module="chat"><ChatPage /></PermissionGuard>} />
                    <Route path="project-chat" element={<PermissionGuard module="project_chat"><ProjectChatPage /></PermissionGuard>} />
                    <Route path="chat/widgets" element={<PermissionGuard module="chat"><ChatWidgetsPage /></PermissionGuard>} />
                    <Route path="user-tracker" element={<PermissionGuard module="user_tracker"><UserTrackerPage /></PermissionGuard>} />
                    <Route path="screen-monitoring" element={<PermissionGuard module="screen_monitoring"><ScreenMonitoringPage /></PermissionGuard>} />
                    <Route path="reports" element={<PermissionGuard module="reports"><ReportsPage /></PermissionGuard>} />

                    <Route path="files" element={<PermissionGuard module="files"><FilesPage /></PermissionGuard>} />
                    <Route path="settings" element={<PermissionGuard module="settings"><SettingsPage /></PermissionGuard>} />
                    <Route path="settings/roles" element={<PermissionGuard module="roles"><RolesPermissionsPage /></PermissionGuard>} />
                    <Route path="ai-assistant" element={<PermissionGuard module="ai_assistant"><AIAssistantPage /></PermissionGuard>} />

                    {/* Quotations */}
                    <Route path="quotations" element={<PermissionGuard module="quotations"><QuotationsPage /></PermissionGuard>} />
                    <Route path="quotations/create" element={<PermissionGuard module="quotations"><QuotationEditor /></PermissionGuard>} />
                    <Route path="quotations/:id" element={<PermissionGuard module="quotations"><QuotationDetailPage /></PermissionGuard>} />
                    <Route path="quotations/:id/edit" element={<PermissionGuard module="quotations"><QuotationEditor /></PermissionGuard>} />
                </Route>

                {/* Employee Routes */}
                <Route path="/employee" element={<EmployeeLayout />}>
                    <Route index element={<Navigate to="/employee/dashboard" replace />} />
                    <Route path="dashboard" element={<EmployeeDashboardPage />} />

                    <Route path="projects" element={<PermissionGuard module="projects"><ProjectsPage /></PermissionGuard>} />
                    <Route path="projects/:id" element={<PermissionGuard module="projects"><ProjectDetailPage /></PermissionGuard>} />

                    <Route path="tasks" element={<PermissionGuard module="tasks"><TasksPage /></PermissionGuard>} />
                    <Route path="tasks/:id" element={<PermissionGuard module="tasks"><TaskDetailPage /></PermissionGuard>} />

                    <Route path="time" element={<PermissionGuard module="time_tracking"><TimePage /></PermissionGuard>} />
                    <Route path="project-chat" element={<PermissionGuard module="project_chat"><ProjectChatPage /></PermissionGuard>} />
                    <Route path="files" element={<PermissionGuard module="files"><FilesPage /></PermissionGuard>} />
                    <Route path="tickets" element={<PermissionGuard module="tickets"><TicketsPage /></PermissionGuard>} />
                    <Route path="attendance" element={<PermissionGuard module="attendance"><AttendancePage /></PermissionGuard>} />
                    <Route path="settings" element={<PermissionGuard module="settings"><EmployeeSettingsPage /></PermissionGuard>} />
                </Route>

                {/* Client Routes */}
                <Route path="/client" element={<ClientLayout />}>
                    <Route index element={<Navigate to="/client/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="projects" element={<PermissionGuard module="projects"><ProjectsPage /></PermissionGuard>} />
                    <Route path="projects/:id" element={<PermissionGuard module="projects"><ProjectDetailPage /></PermissionGuard>} />
                    <Route path="tasks" element={<PermissionGuard module="tasks"><TasksPage /></PermissionGuard>} />
                    <Route path="tasks/:id" element={<PermissionGuard module="tasks"><TaskDetailPage /></PermissionGuard>} />
                    <Route path="invoices" element={<PermissionGuard module="invoices"><InvoicesPage /></PermissionGuard>} />
                    <Route path="invoices/:id" element={<PermissionGuard module="invoices"><InvoiceDetailPage /></PermissionGuard>} />
                    <Route path="project-chat" element={<PermissionGuard module="project_chat"><ProjectChatPage /></PermissionGuard>} />
                    <Route path="tickets" element={<PermissionGuard module="tickets"><TicketsPage /></PermissionGuard>} />
                    <Route path="files" element={<PermissionGuard module="files"><FilesPage /></PermissionGuard>} />
                    <Route path="settings" element={<PermissionGuard module="settings"><EmployeeSettingsPage /></PermissionGuard>} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    )
}
