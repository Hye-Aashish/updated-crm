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
const QuotationTemplates = lazy(() => import('./pages/quotations/templates'))
const QuotationEditor = lazy(() => import('./pages/quotations/create'))
const QuotationDetailPage = lazy(() => import('./pages/quotations/[id]'))

const EmployeeDashboardPage = lazy(() => import('./pages/employee-dashboard').then(m => ({ default: m.EmployeeDashboardPage })))
const EmployeeSettingsPage = lazy(() => import('./pages/employee-settings').then(m => ({ default: m.EmployeeSettingsPage })))

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
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="leads" element={<LeadsPage />} />
                    <Route path="clients" element={<ClientsPage />} />
                    <Route path="clients/new" element={<NewClientPage />} />
                    <Route path="clients/:id" element={<ClientDetailPage />} />
                    <Route path="clients/:id/edit" element={<EditClientPage />} />

                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/new" element={<NewProjectPage />} />
                    <Route path="projects/:id" element={<ProjectDetailPage />} />
                    <Route path="projects/:id/edit" element={<EditProjectPage />} />

                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="tasks/:id" element={<TaskDetailPage />} />

                    {/* Operations */}
                    <Route path="team" element={<TeamPage />} />
                    <Route path="team/:id" element={<TeamMemberPage />} />

                    <Route path="time" element={<TimePage />} />
                    <Route path="time/reports" element={<TimeReportsPage />} />

                    {/* Finance */}
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="invoices/new" element={<NewInvoicePage />} />
                    <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                    <Route path="expenses" element={<ExpensesPage />} />
                    <Route path="salary" element={<SalaryPage />} />
                    <Route path="amc" element={<AmcPage />} />
                    <Route path="domains" element={<DomainsPage />} />
                    <Route path="hosting" element={<HostingPage />} />
                    <Route path="expiry-alerts" element={<ExpiryAlertsPage />} />

                    {/* Support & Analysis */}
                    <Route path="tickets" element={<TicketsPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="project-chat" element={<ProjectChatPage />} />
                    <Route path="chat/widgets" element={<ChatWidgetsPage />} />
                    <Route path="user-tracker" element={<UserTrackerPage />} />
                    <Route path="screen-monitoring" element={<ScreenMonitoringPage />} />
                    <Route path="reports" element={<ReportsPage />} />

                    <Route path="files" element={<FilesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="settings/roles" element={<RolesPermissionsPage />} />
                    <Route path="ai-assistant" element={<AIAssistantPage />} />

                    {/* Quotations */}
                    <Route path="quotations" element={<QuotationsPage />} />
                    <Route path="quotations/templates" element={<QuotationTemplates />} />
                    <Route path="quotations/create" element={<QuotationEditor />} />
                    <Route path="quotations/:id" element={<QuotationDetailPage />} />
                    <Route path="quotations/:id/edit" element={<QuotationEditor />} />
                </Route>

                {/* Employee Routes */}
                <Route path="/employee" element={<EmployeeLayout />}>
                    <Route index element={<Navigate to="/employee/dashboard" replace />} />
                    <Route path="dashboard" element={<EmployeeDashboardPage />} />

                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/:id" element={<ProjectDetailPage />} />

                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="tasks/:id" element={<TaskDetailPage />} />

                    <Route path="time" element={<TimePage />} />
                    <Route path="project-chat" element={<ProjectChatPage />} />
                    <Route path="files" element={<FilesPage />} />
                    <Route path="tickets" element={<TicketsPage />} />
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="settings" element={<EmployeeSettingsPage />} />
                </Route>

                {/* Client Routes */}
                <Route path="/client" element={<ClientLayout />}>
                    <Route index element={<Navigate to="/client/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/:id" element={<ProjectDetailPage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="tasks/:id" element={<TaskDetailPage />} />
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                    <Route path="project-chat" element={<ProjectChatPage />} />
                    <Route path="tickets" element={<TicketsPage />} />
                    <Route path="settings" element={<EmployeeSettingsPage />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    )
}
