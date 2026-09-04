import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRequesterRoute from './components/routing/ProtectedRequesterRoute'
import CreateTicketPage from './pages/CreateTicketPage'
import MyTicketsPage from './pages/MyTicketsPage'
import RequesterSelectionPage from './pages/RequesterSelectionPage'
import RequesterTicketDetailPage from './pages/RequesterTicketDetailPage'
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
            element={<MyTicketsPage />}
          />
          <Route
            path={'tickets/new'}
            element={<CreateTicketPage />}
          />
          <Route
            path={'tickets/:ticketNumber'}
            element={<RequesterTicketDetailPage />}
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
