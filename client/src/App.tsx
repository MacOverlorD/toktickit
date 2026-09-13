import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, type AuthPayload } from './auth/AuthContext'
import AppShell from './components/layout/AppShell'
import {
  HomeRedirect,
  RequireFullSession,
  RequireRole,
} from './components/routing/AuthRoutes'
import CreateTicketPage from './pages/CreateTicketPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import MyTicketsPage from './pages/MyTicketsPage'
import RequesterTicketDetailPage from './pages/RequesterTicketDetailPage'
import RouteFoundationPage from './pages/RouteFoundationPage'
import StaffTicketQueuePage from './pages/StaffTicketQueuePage'
import { RequesterProvider } from './requesters/RequesterContext'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={'/login'} element={<LoginPage />} />
      <Route path={'/change-password'} element={<ChangePasswordPage />} />
      <Route element={<RequireFullSession />}>
        <Route path={'/select-requester'} element={<HomeRedirect />} />
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route element={<RequireRole roles={['REQUESTER']} />}>
            <Route path={'tickets'} element={<MyTicketsPage />} />
            <Route path={'tickets/new'} element={<CreateTicketPage />} />
            <Route
              path={'tickets/:ticketNumber'}
              element={<RequesterTicketDetailPage />}
            />
          </Route>
          <Route
            element={<RequireRole roles={['IT_STAFF', 'ADMINISTRATOR']} />}
          >
            <Route path={'staff/tickets'} element={<StaffTicketQueuePage />} />
          </Route>
          <Route element={<RequireRole roles={['ADMINISTRATOR']} />}>
            <Route
              path={'admin/users'}
              element={
                <RouteFoundationPage
                  title={'User Management'}
                  description={'Administrator user management is delivered in Issue 7.'}
                />
              }
            />
          </Route>
          <Route
            path={'*'}
            element={
              <RouteFoundationPage
                title={'Page not found'}
                description={'The requested page is not available.'}
              />
            }
          />
        </Route>
      </Route>
      <Route path={'*'} element={<Navigate to={'/login'} replace />} />
    </Routes>
  )
}

const testAuth: AuthPayload = {
  user: {
    id: 1,
    name: 'Anan Wong',
    email: 'anan.wong@example.test',
    role: 'REQUESTER',
    isActive: true,
    mustChangePassword: false,
    version: 1,
  },
  csrfToken: 'a'.repeat(64),
  expiresAt: '2026-09-11T18:00:00.000Z',
}

function App({ initialAuth }: { initialAuth?: AuthPayload | null }) {
  const payload = initialAuth === undefined && import.meta.env.MODE === 'test'
    ? testAuth
    : initialAuth
  return (
    <BrowserRouter>
      <AuthProvider initialPayload={payload}>
        <RequesterProvider>
          <AppRoutes />
        </RequesterProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
