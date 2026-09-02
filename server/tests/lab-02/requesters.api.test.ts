import request from 'supertest'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/development-requesters', () => {
  it('returns only active requesters in deterministic case-insensitive name order', async () => {
    const response = await request(app).get('/api/development-requesters')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      { id: expect.any(Number), name: 'Anan Wong', email: 'anan.wong@example.test' },
      { id: expect.any(Number), name: 'Mali Chaiyasit', email: 'mali.chaiyasit@example.test' },
      { id: expect.any(Number), name: 'Narin Suksan', email: 'narin.suksan@example.test' },
      { id: expect.any(Number), name: 'Pimchanok Dee', email: 'pimchanok.dee@example.test' },
    ])
    expect(response.body).not.toContainEqual(
      expect.objectContaining({ email: 'former.requester@example.test' }),
    )
  })

  it('returns an empty successful list when no active requester exists', async () => {
    const findMany = vi.spyOn(prisma.requester, 'findMany').mockResolvedValueOnce([])

    const response = await request(app).get('/api/development-requesters')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    )
  })

  it('orders names without case sensitivity and uses ID as the tie breaker', async () => {
    vi.spyOn(prisma.requester, 'findMany').mockResolvedValueOnce([
      { id: 9, name: 'zeta User', email: 'zeta@example.test' },
      { id: 8, name: 'alpha User', email: 'alpha.two@example.test' },
      { id: 7, name: 'Alpha User', email: 'alpha.one@example.test' },
    ] as never)

    const response = await request(app).get('/api/development-requesters')

    expect(response.status).toBe(200)
    expect(response.body.map(({ id }: { id: number }) => id)).toEqual([7, 8, 9])
  })

  it('returns the safe JSON error contract when the database fails', async () => {
    vi.spyOn(prisma.requester, 'findMany').mockRejectedValueOnce(
      new Error('sensitive database detail'),
    )

    const response = await request(app).get('/api/development-requesters')

    expect(response.status).toBe(500)
    expect(response.headers['content-type']).toMatch(/json/)
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    })
    expect(JSON.stringify(response.body)).not.toContain('sensitive database detail')
  })
})
