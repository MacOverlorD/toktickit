import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { getTicketDetail, type TicketDetail } from '../../src/api/ticket-detail'
import { TicketApiError } from '../../src/api/tickets'

vi.mock('../../src/api/ticket-detail', () => ({
  getTicketDetail: vi.fn(),
}))

const ticketNumber = 'TKT-20260904-A1B2C3D4'
const requesters = [
  { id: 1, name: 'Anan Wong', email: 'anan@example.test' },
  { id: 2, name: 'Mali Chaiyasit', email: 'mali@example.test' },
]
const detail: TicketDetail = {
  ticketNumber,
  ticketDate: '2026-09-04T10:00:00.000Z',
  requester: requesters[0],
  category: { id: 4, name: 'Network' },
  relatedSystem: { id: 3, name: 'VPN' },
  summary: 'VPN access is unavailable',
  requestedPriority: 'HIGH',
  description: 'The VPN client reports an error.\nRestarting does not help.',
  status: 'NEW',
  attachments: [
    {
      id: 11,
      originalName: 'vpn-error.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      createdAt: '2026-09-04T10:01:00.000Z',
      isRemoved: false,
      removedAt: null,
      removalReason: null,
    },
    {
      id: 12,
      originalName: 'old-log.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      createdAt: '2026-09-04T10:02:00.000Z',
      isRemoved: true,
      removedAt: '2026-09-04T10:03:00.000Z',
      removalReason: 'Uploaded wrong file',
    },
  ],
}

beforeEach(() => {
  window.history.replaceState({}, '', `/tickets/${ticketNumber}`)
  vi.mocked(getTicketDetail).mockResolvedValue(detail)
})

afterEach(() => {
  sessionStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

describe('Requester Ticket Detail', () => {
  it('renders all approved read-only fields and active/removed attachment metadata', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: ticketNumber })).toBeInTheDocument()
    expect(getTicketDetail).toHaveBeenCalledWith(ticketNumber)
    expect(screen.getByText('Read-only')).toBeInTheDocument()
    expect(screen.getByText(detail.summary)).toBeInTheDocument()
    const description = screen.getByText(/The VPN client reports an error/)
    expect(description).toHaveTextContent('The VPN client reports an error. Restarting does not help.')
    expect(description).toHaveClass('detail-description')
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByText('VPN')).toBeInTheDocument()
    expect(screen.getAllByText('Anan Wong')).toHaveLength(2)
    expect(screen.getByText('anan@example.test')).toBeInTheDocument()
    expect(screen.getByText('vpn-error.png')).toBeInTheDocument()
    expect(screen.getByText('old-log.pdf')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Removed')).toBeInTheDocument()
    expect(screen.getByText(/Uploaded wrong file/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to My Tickets' })).toHaveAttribute(
      'href', '/tickets',
    )
    expect(screen.queryByText(/internal note/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /status/i })).not.toBeInTheDocument()
  })

  it('shows an explicit loading state without stale detail', async () => {
    vi.mocked(getTicketDetail).mockReturnValue(new Promise(() => undefined))
    render(<App />)

    expect(await screen.findByText('Loading ticket')).toBeInTheDocument()
    expect(screen.queryByText(detail.summary)).not.toBeInTheDocument()
  })

  it('uses the same safe not-found state for missing and cross-owner responses', async () => {
    vi.mocked(getTicketDetail).mockRejectedValue(
      new TicketApiError('RESOURCE_NOT_FOUND', 'Ticket was not found.'),
    )
    render(<App />)

    expect(await screen.findByText('Ticket not found')).toBeInTheDocument()
    expect(screen.getByText('This ticket is not available for the selected requester.'))
      .toBeInTheDocument()
    expect(screen.queryByText('Ticket was not found.')).not.toBeInTheDocument()
    expect(screen.queryByText(detail.summary)).not.toBeInTheDocument()
  })

  it('shows a safe failure and retries without exposing exception details', async () => {
    vi.mocked(getTicketDetail)
      .mockRejectedValueOnce(new Error('database hostname leaked'))
      .mockResolvedValueOnce(detail)
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Ticket unavailable')
    expect(screen.queryByText('database hostname leaked')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: ticketNumber })).toBeInTheDocument()
    expect(getTicketDetail).toHaveBeenCalledTimes(2)
  })

  it('keeps ticket ownership bound to the authenticated requester', async () => {
    render(<App />)

    expect(await screen.findByText(detail.summary)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Change Development Requester/ }),
    ).not.toBeInTheDocument()
    expect(getTicketDetail).toHaveBeenCalledWith(ticketNumber)
  })
})
