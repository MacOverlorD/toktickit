import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import * as dashboardApi from '../../src/api/requester-dashboard'
import type { AuthPayload } from '../../src/auth/AuthContext'

vi.mock('../../src/api/requester-dashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof dashboardApi>()),
  getRequesterDashboard: vi.fn(),
}))

const dashboard: dashboardApi.RequesterDashboardResult = {
  asOf: '2026-10-08T12:00:00.000Z',
  counts: { open: 4, waitingForRequester: 1, recentlyResolved: 2 },
  drillDown: {
    open: '/tickets?scope=open',
    waitingForRequester: '/tickets?status=WAITING_FOR_REQUESTER',
    recentlyResolved:
      '/tickets?scope=recently-resolved&asOf=2026-10-08T12%3A00%3A00.000Z',
  },
  attentionTickets: [
    {
      ticketNumber: 'TKT-20261008-A1B2C3D4',
      summary: 'Please confirm the VPN test result',
      status: 'WAITING_FOR_REQUESTER',
      requestedPriority: 'HIGH',
      updatedAt: '2026-10-08T10:30:00.000Z',
    },
  ],
  recentTickets: [
    {
      ticketNumber: 'TKT-20261008-E5F6G7H8',
      summary: 'Email access restored',
      status: 'RESOLVED',
      requestedPriority: 'MEDIUM',
      updatedAt: '2026-10-08T11:00:00.000Z',
    },
  ],
}

const staff: AuthPayload = {
  user: {
    id: 9,
    name: 'Suda Staff',
    email: 'suda@example.test',
    role: 'IT_STAFF',
    isActive: true,
    mustChangePassword: false,
    version: 1,
  },
  csrfToken: 'a'.repeat(64),
  expiresAt: '2026-10-09T00:00:00.000Z',
}

beforeEach(() => {
  window.history.replaceState({}, '', '/dashboard')
  vi.mocked(dashboardApi.getRequesterDashboard).mockResolvedValue(dashboard)
})

afterEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/')
})

describe('Issue 59 Requester Dashboard', () => {
  it('shows loading then authoritative metrics, ticket lists, and exact drill-down links', async () => {
    let resolveDashboard!: (value: dashboardApi.RequesterDashboardResult) => void
    vi.mocked(dashboardApi.getRequesterDashboard).mockReturnValue(
      new Promise((resolve) => {
        resolveDashboard = resolve
      }),
    )
    render(<App />)

    expect(screen.getByText('Loading dashboard')).toBeInTheDocument()
    resolveDashboard(dashboard)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByLabelText('Open tickets: 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Waiting for you: 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Resolved in 7 days: 2')).toBeInTheDocument()
    expect(screen.getByText('Please confirm the VPN test result')).toBeInTheDocument()
    expect(screen.getByText('Email access restored')).toBeInTheDocument()

    const metricLinks = screen.getAllByRole('link', { name: /View tickets/ })
    expect(metricLinks.map((link) => link.getAttribute('href'))).toEqual([
      dashboard.drillDown.open,
      dashboard.drillDown.waitingForRequester,
      dashboard.drillDown.recentlyResolved,
    ])
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('renders useful zero states and a create action', async () => {
    vi.mocked(dashboardApi.getRequesterDashboard).mockResolvedValue({
      ...dashboard,
      counts: { open: 0, waitingForRequester: 0, recentlyResolved: 0 },
      attentionTickets: [],
      recentTickets: [],
    })
    render(<App />)

    expect(await screen.findByText('Nothing needs your attention right now.')).toBeInTheDocument()
    expect(screen.getByText('No tickets yet. Create one when you need IT support.'))
      .toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create your first ticket/ }))
      .toHaveAttribute('href', '/tickets/new')
  })

  it('shows a safe retryable failure and recovers without losing the route', async () => {
    vi.mocked(dashboardApi.getRequesterDashboard)
      .mockRejectedValueOnce(new Error('database details must not render'))
      .mockResolvedValueOnce(dashboard)
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard unavailable')
    expect(screen.queryByText('database details must not render')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByLabelText('Open tickets: 4')).toBeInTheDocument()
    await waitFor(() => expect(dashboardApi.getRequesterDashboard).toHaveBeenCalledTimes(2))
  })

  it('blocks a staff direct route before requesting requester data', () => {
    render(<App initialAuth={staff} />)
    expect(screen.getByRole('heading', { name: 'Forbidden' })).toBeInTheDocument()
    expect(dashboardApi.getRequesterDashboard).not.toHaveBeenCalled()
  })
})
