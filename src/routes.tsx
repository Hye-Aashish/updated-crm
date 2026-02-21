import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/auth/login'
import { ForgotPasswordPage } from './pages/auth/forgot-password'
import { DashboardLayout } from './components/layout/dashboard-layout'
import { EmployeeLayout } from './components/layout/employee-layout'
import { DashboardPage } from './pages/dashboard'
import { EmployeeDashboardPage } from './pages/employee-dashboard'
import { EmployeeSettingsPage } from './pages/employee-settings'
import { ClientsPage } from './pages/clients'
import { ClientDetailPage } from './pages/clients/[id]'
import { EditClientPage } from './pages/clients/edit'
import { NewClientPage } from './pages/clients/new'
import { ProjectsPage } from './pages/projects'
import { ProjectDetailPage } from './pages/projects/[id]'
import { EditProjectPage } from './pages/projects/edit'
import { NewProjectPage } from './pages/projects/new'
import { TasksPage } from './pages/tasks'
import { TaskDetailPage } from './pages/tasks/[id]'
import { TeamPage } from './pages/team'
import { TeamMemberPage } from './pages/team/[id]'
import { TimePage } from './pages/time'
import { TimeReportsPage } from './pages/time/reports'
import { InvoicesPage } from './pages/invoices'
import { NewInvoicePage } from './pages/invoices/new'
import { InvoiceDetailPage } from './pages/invoices/[id]'
import { FilesPage } from './pages/files'
import { SettingsPage } from './pages/settings'
import { TicketsPage } from './pages/tickets'
import { ReportsPage } from './pages/reports'
import { LeadsPage } from './pages/leads'
import { ExpensesPage } from './pages/expenses'
import { SalaryPage } from './pages/salary'
import { AttendancePage } from './pages/attendance'
import { PublicLeadForm } from './pages/public/lead-form'
import PublicQuotationView from './pages/public/quotation-view'
import { ChatPage } from './pages/chat'
import { ChatWidgetsPage } from './pages/chat/widgets'
import UserTrackerPage from './pages/user-tracker'
import QuotationsPage from './pages/quotations'
import QuotationEditor from './pages/quotations/create'
import QuotationDetailPage from './pages/quotations/[id]'
import QuotationTemplates from './pages/quotations/templates'


export function AppRoutes() {
    return (
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

                {/* Support & Analysis */}
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="chat/widgets" element={<ChatWidgetsPage />} />
                <Route path="user-tracker" element={<UserTrackerPage />} />
                <Route path="reports" element={<ReportsPage />} />

                <Route path="files" element={<FilesPage />} />
                <Route path="settings" element={<SettingsPage />} />

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
                <Route path="files" element={<FilesPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="settings" element={<EmployeeSettingsPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}
