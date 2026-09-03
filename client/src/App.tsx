import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRequesterRoute from './components/routing/ProtectedRequesterRoute'
import CreateTicketPage from './pages/CreateTicketPage'
import RequesterSelectionPage from './pages/RequesterSelectionPage'
import RouteFoundationPage from './pages/RouteFoundationPage'
import SystemCheckPage from './pages/SystemCheckPage'
import { RequesterProvider } from './requesters/RequesterContext'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<SystemCheckPage />} />
        <Route
          path={'select-requester'}
          element={<RequesterSelectionPage />}
        />
        <Route element={<ProtectedRequesterRoute />}>
          <Route
            path={'tickets'}
            element={
              <RouteFoundationPage
                title={'My Tickets'}
                description={'Requester-owned IT support tickets.'}
              />
            }
          />
          <Route
            path={'tickets/new'}
            element={<CreateTicketPage />}
          />
          <Route
            path={'tickets/:ticketNumber'}
            element={
              <RouteFoundationPage
                title={'Ticket Detail'}
                description={'Read-only requester ticket information.'}
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
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <RequesterProvider>
        <AppRoutes />
      </RequesterProvider>
    </BrowserRouter>
  )
}

export default App
