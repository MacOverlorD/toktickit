import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import * as operationsApi from '../../src/api/operations-dashboard'
import * as dashboardApi from '../../src/api/requester-dashboard'
import type { AuthPayload } from '../../src/auth/AuthContext'

vi.mock('../../src/api/requester-dashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof dashboardApi>()),
  getRequesterDashboard: vi.fn(),
}))

vi.mock('../../src/api/operations-dashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof operationsApi>()),
  getOperationsDashboard: vi.fn(),
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

const administrator: AuthPayload = {
  ...staff,
  user: {
    ...staff.user,
    id: 10,
    name: 'Araya Administrator',
    email: 'araya@example.test',
    role: 'ADMINISTRATOR',
  },
}

const operationsDashboard: operationsApi.OperationsDashboardResult = {
  asOf: '2026-10-08T12:00:00.000Z',
  counts: {
    unassigned: 5,
    ownedByMe: 3,
    myAssignedActions: 2,
    myPerformedLast7Days: 7,
  },
  byStatus: {
    NEW: 2,
    OPEN: 3,
    IN_PROGRESS: 4,
    WAITING_FOR_REQUESTER: 1,
    RESOLVED: 5,
    CLOSED: 6,
    REOPENED: 0,
    CANCELLED: 0,
  },
  byPriority: { LOW: 2, MEDIUM: 3, HIGH: 4, URGENT: 1 },
  myActions: [
    {
      id: 42,
      ticketNumber: 'TKT-20261008-OPS00001',
      description: 'Verify the service recovery',
      status: 'IN_PROGRESS',
      assignedTo: { id: 9, name: 'Suda Staff', role: 'IT_STAFF' },
      updatedAt: '2026-10-08T11:30:00.000Z',
    },
  ],
  urgentTickets: [
    {
      ticketNumber: 'TKT-20261008-OPS00002',
      summary: 'Production network unavailable',
      status: 'OPEN',
      itPriority: 'URGENT',
      owner: null,
      updatedAt: '2026-10-08T11:45:00.000Z',
    },
  ],
  recentTickets: [
    {
      ticketNumber: 'TKT-20261008-OPS00001',
      summary: 'Service recovery in progress',
      status: 'IN_PROGRESS',
      itPriority: 'HIGH',
      owner: { id: 9, name: 'Suda Staff', role: 'IT_STAFF' },
      updatedAt: '2026-10-08T11:30:00.000Z',
    },
  ],
}

beforeEach(() => {
  window.history.replaceState({}, '', '/dashboard')
  vi.mocked(dashboardApi.getRequesterDashboard).mockResolvedValue(dashboard)
  vi.mocked(operationsApi.getOperationsDashboard).mockResolvedValue(operationsDashboard)
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

describe('Issue 60 Operational Dashboard', () => {
  it('shows distinct operational metrics, exact drill-downs, lists, and active navigation', async () => {
    window.history.replaceState({}, '', '/staff/dashboard')
    render(<App initialAuth={staff} />)

    expect(screen.getByText('Loading operational dashboard')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Operational Dashboard' })).toBeInTheDocument()
    expect(screen.getByLabelText('Unassigned tickets: 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Owned by me: 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Actions assigned to me: 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Completed by me in 7 days: 7')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /View queue/ }).find(
      (link) => link.getAttribute('href')?.includes('ownerId=unassigned'),
    )).toHaveAttribute('href', '/staff/tickets?ownerId=unassigned')
    expect(screen.getByRole('link', { name: /View my tickets/ })).toHaveAttribute(
      'href',
      '/staff/tickets?ownerId=me',
    )
    expect(screen.getByRole('link', { name: /Action #42/ })).toHaveAttribute(
      'href',
      '/staff/tickets/TKT-20261008-OPS00001#action-42',
    )
    expect(screen.getByText('Production network unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Account summary' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the account summary to Administrators only', async () => {
    vi.mocked(operationsApi.getOperationsDashboard).mockResolvedValue({
      ...operationsDashboard,
      administration: {
        activeRequesters: 10,
        activeStaff: 4,
        activeAdministrators: 2,
        inactiveAccounts: 3,
      },
    })
    window.history.replaceState({}, '', '/staff/dashboard')
    render(<App initialAuth={administrator} />)

    expect(await screen.findByRole('heading', { name: 'Account summary' })).toBeInTheDocument()
    expect(screen.getByText('Active Administrators')).toBeInTheDocument()
    expect(screen.getByText('Inactive Accounts')).toBeInTheDocument()
  })

  it('renders empty lists and retries a safe failure', async () => {
    vi.mocked(operationsApi.getOperationsDashboard)
      .mockRejectedValueOnce(new Error('private database detail'))
      .mockResolvedValueOnce({
        ...operationsDashboard,
        myActions: [],
        urgentTickets: [],
        recentTickets: [],
      })
    window.history.replaceState({}, '', '/staff/dashboard')
    render(<App initialAuth={staff} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Operational dashboard unavailable')
    expect(screen.queryByText('private database detail')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No active Actions are assigned to you.')).toBeInTheDocument()
    expect(screen.getByText('No active urgent tickets.')).toBeInTheDocument()
    expect(screen.getByText('No tickets are available.')).toBeInTheDocument()
    await waitFor(() => expect(operationsApi.getOperationsDashboard).toHaveBeenCalledTimes(2))
  })

  it('blocks a Requester direct route before requesting operational data', () => {
    window.history.replaceState({}, '', '/staff/dashboard')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Forbidden' })).toBeInTheDocument()
    expect(operationsApi.getOperationsDashboard).not.toHaveBeenCalled()
  })
})
