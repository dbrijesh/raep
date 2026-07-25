import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/AppShell'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Tasks } from './pages/Tasks'
import { WorkflowDesigner } from './pages/Admin/WorkflowDesigner'
import { Users } from './pages/Admin/Users'
import { AuditLog } from './pages/Admin/AuditLog'
import { AgentPlayground } from './pages/Admin/AgentPlayground'
import { AgentBuilder } from './pages/Admin/AgentBuilder'
import { WorkflowsPage } from './pages/Workflows'
import { useAuthStore } from './stores/auth'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            {/* TODO({{PLATFORM_NAME}}): add workload-specific routes here */}
            <Route path="admin/workflows" element={<WorkflowDesigner />} />
            <Route path="admin/users" element={<Users />} />
            <Route path="admin/audit" element={<AuditLog />} />
            <Route path="admin/agents" element={<AgentPlayground />} />
            <Route path="admin/agent-builder" element={<AgentBuilder />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
