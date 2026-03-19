# Nexprism - Agency Management System

Complete SaaS-style Agency Management System frontend built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Dashboard** - KPI cards, task widgets, project overview
- **Clients Management** - Complete client lifecycle management
- **Projects** - Kanban board, milestones, time tracking
- **Tasks** - Drag & drop, status management, assignments
- **Team** - Developer management, workload tracking'
- 
- **Time Tracking** - Timer widget, reports, logs
- **Invoices** - Create, manage, track payments
- **Files** - Mock file management system
- **Settings** - Company profile, branding, roles

## 🛠️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Zustand** - State management
- **React Router** - Routing
- **Lucide React** - Icons
- **Recharts** - Charts & graphs
- **React Hook Form + Zod** - Form validation
- **TanStack Table** - Data tables

## 📦 Installation

Since npm is not available, you'll need to:

1. Install Node.js and npm first
2. Then run:

\`\`\`bash
npm install
\`\`\`

## 🎯 Development

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

The app will be available at `http://localhost:5173`

## 📁 Project Structure

\`\`\`
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   └── ...              # Feature components
├── pages/               # Page components
├── lib/                 # Utilities & mock data
├── store/               # Zustand store
├── types/               # TypeScript types
├── hooks/               # Custom hooks
└── App.tsx              # Main app component
\`\`\`

## 🎨 Features Implemented

### ✅ Core Infrastructure
- Complete routing setup
- Dark mode support
- Responsive design
- Toast notifications
- Theme provider

### ✅ UI Components
- Button, Input, Textarea
- Card, Badge, Avatar
- Dialog, Tabs, Select
- Dropdown Menu
- Progress, Skeleton
- Switch, Label

### ✅ State Management
- Zustand store with all CRUD operations
- Mock data for 10 clients, 8 projects, 14 tasks
- Time tracking with timer
- Invoice management
- Activity logging
- Notifications

### 🚧 To Be Implemented
- All page components
- Kanban board
- Data tables
- Charts & reports
- Form validations
- File upload UI
- And more...

## 📝 Mock Data

The app comes with realistic mock data:
- 6 team members
- 10 clients
- 8 projects
- 14 tasks
- 5 invoices
- Time entries
- Communication logs
- Activities
- Notifications

## 🔐 Authentication

Currently using mock authentication. Login page is ready but authentication logic is not implemented (as per requirements).

## 🎯 Next Steps

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open browser to `http://localhost:5173`
4. Explore the dashboard and all features

## 📄 License

Private project for Nexprism IT Agency

---

Built with ❤️ for Nexprism
