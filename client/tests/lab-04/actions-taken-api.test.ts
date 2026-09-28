import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assignActionTaken,
  completeActionTaken,
  createActionTaken,
  listActionsTaken,
  transitionActionTaken,
} from '../../src/api/actions-taken'

const response = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('Actions Taken API client', () => {
  it('uses the public scoped list and preserves the create idempotency header', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ item: { id: 1 } }, 201))
    vi.stubGlobal('fetch', fetch)
    await listActionsTaken('TKT-20260928-A1B2C3D4')
    await createActionTaken('TKT-20260928-A1B2C3D4', {
      description: 'Inspect', followUpRequired: false,
    }, '123e4567-e89b-42d3-a456-426614174000')

    expect(fetch.mock.calls[0][0]).toContain('/api/tickets/TKT-20260928-A1B2C3D4/actions')
    const create = fetch.mock.calls[1][1] as RequestInit
    expect(create.method).toBe('POST')
    expect(new Headers(create.headers).get('Idempotency-Key')).toBe('123e4567-e89b-42d3-a456-426614174000')
  })

  it('sends version-bound assignment and lifecycle commands', async () => {
    const fetch = vi.fn().mockImplementation(async () => response({ item: { id: 7 } }))
    vi.stubGlobal('fetch', fetch)
    await assignActionTaken(ticketNumber, 7, 9, 3)
    await transitionActionTaken(ticketNumber, 7, 'start', 4)
    await completeActionTaken(ticketNumber, 7, 5, 'Done')
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      expect.stringContaining('/actions/7/assignment'),
      expect.stringContaining('/actions/7/start'),
      expect.stringContaining('/actions/7/complete'),
    ])
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ assignedToUserId: 9, expectedVersion: 3 })
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ expectedVersion: 5, result: 'Done' })
  })

  it('keeps safe error codes and field errors for conflict recovery and focus', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      error: { code: 'STALE_RESOURCE', message: 'Changed.', fieldErrors: { result: 'Required.' } },
    }, 409)))
    await expect(completeActionTaken(ticketNumber, 7, 2, '')).rejects.toMatchObject({
      code: 'STALE_RESOURCE', fieldErrors: { result: 'Required.' },
    })
  })
})

const ticketNumber = 'TKT-20260928-A1B2C3D4'
