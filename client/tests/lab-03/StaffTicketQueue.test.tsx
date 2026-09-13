import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { setApiCsrfToken } from '../../src/api/request'
import type { AuthPayload } from '../../src/auth/AuthContext'

const staff: AuthPayload = {
  user: { id: 9, name: 'Suda Staff', email: 'suda@example.test', role: 'IT_STAFF', isActive: true, mustChangePassword: false, version: 1 },
  csrfToken: 'a'.repeat(64), expiresAt: '2026-09-14T00:00:00.000Z',
}
const queue = {
  items: [{ ticketNumber: 'TKT-20260913-ABCDEF01', createdAt: '2026-09-13T01:00:00.000Z', updatedAt: '2026-09-13T02:00:00.000Z', summary: 'Laptop cannot connect', version: 1, category: { id: 1, name: 'Hardware' }, requestedPriority: 'HIGH', itPriority: 'URGENT', status: 'OPEN', owner: null }],
  pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
  filterOptions: { categories: [{ id: 1, name: 'Hardware', isActive: true }], relatedSystems: [{ id: 1, name: 'Laptop', isActive: true }], owners: [] },
}
function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, headers: new Headers(), json: vi.fn().mockResolvedValue(body) } as unknown as Response
}
beforeEach(() => { window.history.replaceState({}, '', '/staff/tickets'); setApiCsrfToken(null) })
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); window.history.replaceState({}, '', '/') })

describe('Staff Ticket Queue', () => {
  it('renders responsive cards with ownership, badges, and detail navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, queue)))
    render(<App initialAuth={staff} />)
    expect(await screen.findByText('Laptop cannot connect')).toBeInTheDocument()
    expect(screen.getAllByText('Unassigned')).toHaveLength(2)
    expect(screen.getByLabelText('Status: Open')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open ticket' })).toHaveAttribute('href', '/staff/tickets/TKT-20260913-ABCDEF01')
  })

  it('stores submitted filters in the URL and resets the page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, queue))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialAuth={staff} />)
    await screen.findByText('Laptop cannot connect')
    fireEvent.change(screen.getByLabelText('Search tickets'), { target: { value: 'laptop' } })
    fireEvent.change(screen.getByLabelText('IT Priority'), { target: { value: 'URGENT' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(window.location.search).toContain('search=laptop'))
    expect(window.location.search).toContain('itPriority=URGENT')
    expect(window.location.search).toContain('page=1')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows forbidden and recoverable failure states', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, {})))
    const view = render(<App initialAuth={staff} />)
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    view.unmount()
    render(<App initialAuth={staff} />)
    expect(await screen.findByRole('heading', { name: 'Queue unavailable' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('distinguishes empty queues from filtered no-results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { ...queue, items: [], pagination: { ...queue.pagination, totalItems: 0, totalPages: 0 } })))
    const view = render(<App initialAuth={staff} />)
    expect(await screen.findByRole('heading', { name: 'No tickets yet' })).toBeInTheDocument()
    view.unmount()
    window.history.replaceState({}, '', '/staff/tickets?search=laptop')
    render(<App initialAuth={staff} />)
    expect(await screen.findByRole('heading', { name: 'No matching tickets' })).toBeInTheDocument()
  })
})
