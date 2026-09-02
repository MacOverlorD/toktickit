import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDevelopmentRequesters } from '../../src/api/development-requesters'
import { apiFetch } from '../../src/api/request'

vi.mock('../../src/api/request', () => ({
  apiFetch: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('Development Requester API response handling', () => {
  it('maps responses to the documented public requester shape', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: 'Anan Wong',
          email: 'anan.wong@example.test',
          isActive: true,
          internalNote: 'must not reach context',
        },
      ],
    } as Response)

    await expect(getDevelopmentRequesters()).resolves.toEqual([
      { id: 1, name: 'Anan Wong', email: 'anan.wong@example.test' },
    ])
  })

  it('rejects a response that is not an array of public requesters', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, name: 'Missing email' }],
    } as Response)

    await expect(getDevelopmentRequesters()).rejects.toThrow(
      'The Development Requester response is invalid.',
    )
  })
})
