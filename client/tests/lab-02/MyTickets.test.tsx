import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { getDevelopmentRequesters } from '../../src/api/development-requesters'
import { getMyTickets, type TicketListResult } from '../../src/api/tickets'
import { DEVELOPMENT_REQUESTER_STORAGE_KEY } from '../../src/requesters/RequesterContext'

vi.mock('../../src/api/development-requesters', () => ({
  getDevelopmentRequesters: vi.fn(),
}))
vi.mock('../../src/api/tickets', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/api/tickets')>()
  return { ...original, getMyTickets: vi.fn() }
})

const requesters = [
  { id: 1, name: 'Anan Wong', email: 'anan@example.test' },
  { id: 2, name: 'Mali Chaiyasit', email: 'mali@example.test' },
]
const ticket = {
  ticketNumber: 'TKT-20260904-A1B2C3D4',
  createdAt: '2026-09-04T10:00:00.000Z',
  summary: 'VPN access is unavailable',
  requestedPriority: 'HIGH' as const,
  status: 'NEW' as const,
  category: { id: 4, name: 'Network' },
  relatedSystem: { id: 3, name: 'VPN' },
  attachmentCount: 2,
}

function listResult(overrides: Partial<TicketListResult> = {}): TicketListResult {
  return {
    items: [ticket],
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    query: {
      search: null,
      categoryId: null,
      relatedSystemId: null,
      status: null,
      priority: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    filterOptions: {
      categories: [
        { id: 1, name: 'Hardware', isActive: true },
        { id: 4, name: 'Network', isActive: true },
        { id: 9, name: 'Retired Category', isActive: false },
      ],
      relatedSystems: [
        { id: 3, name: 'VPN', isActive: true },
        { id: 7, name: 'Printer', isActive: true },
        { id: 10, name: 'Retired System', isActive: false },
      ],
    },
    ...overrides,
  }
}

beforeEach(() => {
  sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, '1')
  window.history.replaceState({}, '', '/tickets')
  vi.mocked(getDevelopmentRequesters).mockResolvedValue(requesters)
  vi.mocked(getMyTickets).mockResolvedValue(listResult())
})

afterEach(() => {
  sessionStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

describe('My Tickets', () => {
  it('keeps the ticket controls visible while the owner list is loading', async () => {
    vi.mocked(getMyTickets).mockReturnValue(
      new Promise(() => {
        // Keep the request pending to verify the explicit loading state.
      }),
    )

    render(<App />)

    expect(await screen.findByText('Loading tickets')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create a new ticket' })).toBeInTheDocument()
  })

  it('renders owner ticket data in desktop and mobile representations with open actions', async () => {
    render(<App />)

    expect(await screen.findByText('1 tickets')).toBeInTheDocument()
    expect(screen.getAllByText(ticket.ticketNumber)).toHaveLength(2)
    expect(screen.getAllByText(ticket.summary)).toHaveLength(2)
    expect(screen.getAllByLabelText('Status: New')).toHaveLength(2)
    expect(screen.getAllByLabelText('Requested priority: High')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: `Open ticket ${ticket.ticketNumber}` }))
      .toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Retired Category (historical)' }))
      .toHaveValue('9')
    expect(screen.getByRole('option', { name: 'Retired System (historical)' }))
      .toHaveValue('10')
    expect(getMyTickets).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10, sortBy: 'createdAt' }),
      1,
    )
  })

  it('submits search and resets page for filters, sorting, and page size', async () => {
    vi.mocked(getMyTickets).mockResolvedValue(listResult({
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
        hasPreviousPage: false,
        hasNextPage: true,
      },
    }))
    render(<App />)
    await screen.findByText('11 tickets')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(getMyTickets).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }), 1,
    ))

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tickets' }), {
      target: { value: '  vpn  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(getMyTickets).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'vpn', page: 1 }), 1,
    ))

    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: '4' },
    })
    await waitFor(() => expect(getMyTickets).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: 4, page: 1 }), 1,
    ))

    fireEvent.change(screen.getByRole('combobox', { name: 'Related System' }), {
      target: { value: '3' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'NEW' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Requested Priority' }), {
      target: { value: 'HIGH' },
    })
    await waitFor(() => expect(getMyTickets).toHaveBeenLastCalledWith(
      expect.objectContaining({
        relatedSystemId: 3, status: 'NEW', priority: 'HIGH', page: 1,
      }), 1,
    ))

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'summary' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort direction' }), {
      target: { value: 'asc' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Tickets per page' }), {
      target: { value: '20' },
    })
    await waitFor(() => expect(getMyTickets).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortBy: 'summary', sortOrder: 'asc', pageSize: 20, page: 1,
      }), 1,
    ))
  })

  it('distinguishes an empty owner list from filtered no-results', async () => {
    vi.mocked(getMyTickets).mockResolvedValue(listResult({
      items: [],
      pagination: {
        page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
        hasPreviousPage: false, hasNextPage: false,
      },
    }))
    const view = render(<App />)

    expect(await screen.findByText('No tickets yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first ticket' })).toBeInTheDocument()

    view.unmount()
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, '1')
    vi.mocked(getMyTickets).mockResolvedValue(listResult({
      items: [],
      pagination: {
        page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
        hasPreviousPage: false, hasNextPage: false,
      },
    }))
    render(<App />)
    await screen.findByText('No tickets yet')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tickets' }), {
      target: { value: 'missing' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('No matching tickets')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear Filters' }).at(-1)!)
    await waitFor(() => expect(getMyTickets).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: '', page: 1, sortBy: 'createdAt' }), 1,
    ))
  })

  it('shows a safe list/filter-metadata failure, preserves controls, and retries', async () => {
    vi.mocked(getMyTickets)
      .mockRejectedValueOnce(new Error('database hostname leaked'))
      .mockResolvedValueOnce(listResult())
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Tickets unavailable')
    expect(screen.queryByText('database hostname leaked')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('1 tickets')).toBeInTheDocument()
    expect(getMyTickets).toHaveBeenCalledTimes(2)
  })

  it('does not let a stale Retry overwrite a newer filtered result', async () => {
    let resolveRetry!: (value: TicketListResult) => void
    const newerTicket = {
      ...ticket,
      ticketNumber: 'TKT-20260904-AAAABBBB',
      summary: 'Current filtered result',
    }
    vi.mocked(getMyTickets)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveRetry = resolve
      }))
      .mockResolvedValueOnce(listResult({ items: [newerTicket] }))
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(getMyTickets).toHaveBeenCalledTimes(2))
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'NEW' },
    })

    expect(await screen.findAllByText('Current filtered result')).toHaveLength(2)
    await act(async () => {
      resolveRetry(listResult())
      await Promise.resolve()
    })
    expect(screen.getAllByText('Current filtered result')).toHaveLength(2)
    expect(screen.queryByText(ticket.summary)).not.toBeInTheDocument()
  })

  it('removes the prior requester data and reloads for the newly selected requester', async () => {
    vi.mocked(getMyTickets).mockImplementation(async (_query, requesterId) =>
      requesterId === 1
        ? listResult()
        : listResult({
            items: [{ ...ticket, ticketNumber: 'TKT-20260904-EEEEFFFF', summary: 'Printer issue' }],
          }),
    )
    render(<App />)
    expect(await screen.findAllByText(ticket.ticketNumber)).toHaveLength(2)

    fireEvent.click(screen.getByRole('link', { name: /Change Development Requester/ }))
    const requesterSelect = await screen.findByRole('combobox', {
      name: /Development Requester/,
    })
    fireEvent.change(requesterSelect, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findAllByText('TKT-20260904-EEEEFFFF')).toHaveLength(2)
    expect(screen.queryByText(ticket.ticketNumber)).not.toBeInTheDocument()
    expect(getMyTickets).toHaveBeenLastCalledWith(expect.any(Object), 2)
  })
})
