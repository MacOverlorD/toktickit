import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../../src/api/request'
import {
  createTicket,
  getMyTickets,
  TicketApiError,
  type CreateTicketInput,
  type TicketListQuery,
  type TicketListResult,
} from '../../src/api/tickets'

vi.mock('../../src/api/request', () => ({
  apiFetch: vi.fn(),
}))

const input: CreateTicketInput = {
  categoryId: 2,
  relatedSystemId: 7,
  summary: 'Laptop battery drains quickly',
  requestedPriority: 'MEDIUM',
  description: 'Battery capacity drops from full to empty in one hour.',
}

const listQuery: TicketListQuery = {
  search: 'vpn',
  categoryId: 2,
  relatedSystemId: 7,
  status: 'NEW',
  priority: 'HIGH',
  sortBy: 'summary',
  sortOrder: 'asc',
  page: 2,
  pageSize: 20,
}

function validListResponse(): TicketListResult {
  return {
    items: [
      {
        ticketNumber: 'TKT-20260904-A1B2C3D4',
        createdAt: '2026-09-04T10:00:00.000Z',
        summary: 'VPN is unavailable',
        requestedPriority: 'HIGH',
        status: 'NEW',
        category: { id: 2, name: 'Network' },
        relatedSystem: { id: 7, name: 'VPN' },
        attachmentCount: 1,
      },
    ],
    pagination: {
      page: 2,
      pageSize: 20,
      totalItems: 25,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    },
    query: {
      search: 'vpn',
      categoryId: 2,
      relatedSystemId: 7,
      status: 'NEW',
      priority: 'HIGH',
      sortBy: 'summary',
      sortOrder: 'asc',
    },
    filterOptions: {
      categories: [
        { id: 2, name: 'Network', isActive: true },
        { id: 9, name: 'Legacy Service', isActive: false },
      ],
      relatedSystems: [
        { id: 7, name: 'VPN', isActive: true },
      ],
    },
  }
}

function errorResponse(fieldErrors: unknown) {
  return {
    ok: false,
    json: vi.fn().mockResolvedValue({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid ticket.',
        fieldErrors,
      },
    }),
  } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Create Ticket API client', () => {
  it.each([
    ['an array', []],
    ['a non-string value', { categoryId: {} }],
    ['an unknown field', { internalField: 'Do not render this.' }],
    ['an empty message', { categoryId: '   ' }],
  ])('discards fieldErrors containing %s', async (_case, fieldErrors) => {
    vi.mocked(apiFetch).mockResolvedValue(errorResponse(fieldErrors))

    const error = await createTicket(
      input,
      1,
      '6f5723c2-e520-4ef3-ab0d-999a48ef2679',
    ).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(TicketApiError)
    expect(error).toMatchObject({ fieldErrors: {} })
  })

  it('retains only a valid record of known string field messages', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      errorResponse({
        categoryId: 'Select an active Category.',
        summary: 'Ticket Summary is required.',
      }),
    )

    const error = await createTicket(
      input,
      1,
      '6f5723c2-e520-4ef3-ab0d-999a48ef2679',
    ).catch((caught: unknown) => caught)

    expect(error).toMatchObject({
      fieldErrors: {
        categoryId: 'Select an active Category.',
        summary: 'Ticket Summary is required.',
      },
    })
  })

  it('sends requester and idempotency context as headers, never in the body', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          ticketNumber: 'TKT-20260903-A1B2C3D4',
          ticketDate: '2026-09-03T12:00:00.000Z',
          status: 'NEW',
          requesterId: 1,
        },
        replayed: false,
      }),
    } as unknown as Response)

    await createTicket(
      input,
      1,
      '6f5723c2-e520-4ef3-ab0d-999a48ef2679',
    )

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tickets',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Development-Requester-Id': '1',
          'Idempotency-Key': '6f5723c2-e520-4ef3-ab0d-999a48ef2679',
        },
        body: JSON.stringify(input),
      }),
    )
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]?.body as string))
      .not.toHaveProperty('requesterId')
  })
})

describe('My Tickets API client', () => {
  it('sends only documented query values and requester context', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(validListResponse()),
    } as unknown as Response)

    await expect(getMyTickets(listQuery, 9)).resolves.toEqual(validListResponse())

    const [path, init] = vi.mocked(apiFetch).mock.calls[0]
    const url = new URL(path, 'http://localhost')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      sortBy: 'summary',
      sortOrder: 'asc',
      page: '2',
      pageSize: '20',
      search: 'vpn',
      categoryId: '2',
      relatedSystemId: '7',
      status: 'NEW',
      priority: 'HIGH',
    })
    expect(init).toEqual({ headers: { 'X-Development-Requester-Id': '9' } })
  })

  it('omits inactive optional controls from the URL', async () => {
    const response = validListResponse()
    response.items = []
    response.pagination.totalItems = 0
    response.pagination.totalPages = 0
    response.pagination.page = 1
    response.pagination.pageSize = 10
    response.pagination.hasPreviousPage = false
    response.query = {
      search: null,
      categoryId: null,
      relatedSystemId: null,
      status: null,
      priority: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(response),
    } as unknown as Response)

    await getMyTickets({ ...listQuery, ...{
      search: '', categoryId: null, relatedSystemId: null, status: null,
      priority: null, sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 10,
    } }, 1)

    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe(
      '/api/tickets?sortBy=createdAt&sortOrder=desc&page=1&pageSize=10',
    )
  })

  it('rejects an unsafe or malformed list response', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...validListResponse(),
        items: [{ ...validListResponse().items[0], attachmentCount: -1 }],
      }),
    } as unknown as Response)

    await expect(getMyTickets(listQuery, 1)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  })
})
