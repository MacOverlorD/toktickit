import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTicketDetail } from '../../src/api/ticket-detail'
import { apiFetch } from '../../src/api/request'

vi.mock('../../src/api/request', () => ({
  apiFetch: vi.fn(),
}))

const validResponse = {
  ticketNumber: 'TKT-20260904-A1B2C3D4',
  ticketDate: '2026-09-04T10:00:00.000Z',
  requester: { id: 1, name: 'Anan Wong', email: 'anan@example.test' },
  category: { id: 4, name: 'Network' },
  relatedSystem: { id: 3, name: 'VPN' },
  summary: 'VPN access is unavailable',
  requestedPriority: 'HIGH',
  description: 'The VPN client cannot establish a connection.',
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
  vi.clearAllMocks()
})

describe('Ticket Detail API client', () => {
  it('requests the encoded ticket route with requester context', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(validResponse),
    } as unknown as Response)

    await expect(getTicketDetail('TKT-20260904-A1B2C3D4', 9))
      .resolves.toMatchObject({ ticketNumber: validResponse.ticketNumber })
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tickets/TKT-20260904-A1B2C3D4',
      { headers: { 'X-Development-Requester-Id': '9' } },
    )
  })

  it('retains only approved ticket and attachment metadata fields', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...validResponse,
        requesterId: 1,
        internalNotes: 'must not escape',
        attachments: [{
          ...validResponse.attachments[0],
          storedName: 'private-storage-name',
          removedByRequesterId: 1,
        }],
      }),
    } as unknown as Response)

    const ticket = await getTicketDetail(validResponse.ticketNumber, 1)

    expect(ticket).not.toHaveProperty('requesterId')
    expect(ticket).not.toHaveProperty('internalNotes')
    expect(ticket.attachments[0]).not.toHaveProperty('storedName')
    expect(ticket.attachments[0]).not.toHaveProperty('removedByRequesterId')
  })

  it('preserves the safe server error code for missing or cross-owner tickets', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Ticket was not found.' },
      }),
    } as unknown as Response)

    await expect(getTicketDetail(validResponse.ticketNumber, 2)).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Ticket was not found.',
    })
  })

  it.each([
    {
      name: 'inconsistent active removal metadata',
      response: {
        ...validResponse,
        attachments: [{ ...validResponse.attachments[0], removalReason: 'Unexpected reason' }],
      },
    },
    {
      name: 'invalid attachment size',
      response: {
        ...validResponse,
        attachments: [{ ...validResponse.attachments[0], sizeBytes: -1 }],
      },
    },
    {
      name: 'unexpected ticket status',
      response: { ...validResponse, status: 'IN_PROGRESS' },
    },
    {
      name: 'malformed response ticket number',
      response: { ...validResponse, ticketNumber: 'ticket-17' },
    },
  ])('rejects $name', async ({ response }) => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(response),
    } as unknown as Response)

    await expect(getTicketDetail(validResponse.ticketNumber, 1)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  })
})
