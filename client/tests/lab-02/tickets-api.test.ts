import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../../src/api/request'
import {
  createTicket,
  TicketApiError,
  type CreateTicketInput,
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
