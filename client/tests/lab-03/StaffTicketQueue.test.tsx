import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  it('applies non-search controls immediately while keeping search submitted', async () => {
    window.history.replaceState({}, '', '/staff/tickets?page=4')
    const fetchMock = vi.fn().mockResolvedValue(response(200, queue))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialAuth={staff} />)
    await screen.findAllByText('Laptop cannot connect')
    fireEvent.change(screen.getByLabelText('Search tickets'), { target: { value: 'pending' } })
    for (const [control, value, parameter] of [['Category', '1', 'categoryId'], ['Sort By', 'createdAt', 'sortBy'], ['Page Size', '20', 'pageSize']]) {
      const count = fetchMock.mock.calls.length
      fireEvent.change(screen.getByLabelText(control), { target: { value } })
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(count + 1))
      expect(new URLSearchParams(window.location.search).get(parameter)).toBe(value)
      expect(new URLSearchParams(window.location.search).get('page')).toBe('1')
      expect(window.location.search).not.toContain('search=pending')
      expect(fetchMock.mock.calls.at(-1)?.[0]).toContain(parameter + '=' + value)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(window.location.search).toContain('search=pending'))
  })

  it.each(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED'])('warns about ownerless %s tickets', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { ...queue, items: [{ ...queue.items[0], status }] })))
    render(<App initialAuth={staff} />)
    expect(await screen.findAllByText('Needs assignment')).toHaveLength(2)
  })

  it('returns an out-of-range page to an available page', async () => {
    window.history.replaceState({}, '', '/staff/tickets?page=4')
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200, { ...queue, items: [], pagination: { ...queue.pagination, page: 4 } })).mockResolvedValue(response(200, queue))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialAuth={staff} />)
    expect(await screen.findByRole('heading', { name: 'Page out of range' })).toBeInTheDocument()
    expect(screen.queryByText('No tickets yet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go to last page' }))
    await screen.findAllByText('Laptop cannot connect')
    expect(new URLSearchParams(window.location.search).get('page')).toBe('1')
  })

  it('denies Requesters access to staff detail', async () => {
    window.history.replaceState({}, '', '/staff/tickets/TKT-20260913-ABCDEF01')
    render(<App initialAuth={{ ...staff, user: { ...staff.user, role: 'REQUESTER' } }} />)
    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
  })

  it('renders desktop columns and opens a protected detail destination', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, queue)))
    render(<App initialAuth={staff} />)
    await screen.findAllByText('Laptop cannot connect')
    const table = screen.getByRole('table', { name: 'Staff ticket queue' })
    expect(within(table).getAllByRole('columnheader')).toHaveLength(8)
    expect(within(table).getByText('Unassigned')).toBeInTheDocument()
    expect(within(table).getByLabelText('Status: Open')).toBeInTheDocument()
    fireEvent.click(within(table).getByRole('link', { name: 'Open ticket' }))
    expect(await screen.findByRole('heading', { name: 'Staff Ticket Detail' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/staff/tickets/TKT-20260913-ABCDEF01')
  })

  it('stores submitted filters in the URL and resets the page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, queue))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialAuth={staff} />)
    await screen.findAllByText('Laptop cannot connect')
    fireEvent.change(screen.getByLabelText('Search tickets'), { target: { value: 'laptop' } })
    fireEvent.change(screen.getByLabelText('IT Priority'), { target: { value: 'URGENT' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(window.location.search).toContain('search=laptop'))
    expect(window.location.search).toContain('itPriority=URGENT')
    expect(window.location.search).toContain('page=1')
    expect(fetchMock).toHaveBeenCalledTimes(3)
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
