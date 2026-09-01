import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import RouteFoundationPage from './pages/RouteFoundationPage'
import SystemCheckPage from './pages/SystemCheckPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<SystemCheckPage />} />
        <Route
          path={'select-requester'}
          element={
            <RouteFoundationPage
              title={'Select Development Requester'}
              description={'Choose the testing identity for this browser tab.'}
            />
          }
        />
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
          element={
            <RouteFoundationPage
              title={'Create Ticket'}
              description={'Submit a new IT support request.'}
            />
          }
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
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
