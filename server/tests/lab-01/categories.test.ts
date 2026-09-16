import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import {
  createTestSession,
  type TestSession,
} from '../helpers/auth-session.js'

let session: TestSession

beforeAll(async () => {
  const user = await prisma.user.findFirstOrThrow({
    where: { isActive: true, role: 'REQUESTER' },
    select: { id: true },
  })
  session = await createTestSession(user.id)
})

afterAll(async () => {
  await session.cleanup()
  await prisma.$disconnect()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/categories', () => {
  it('returns the seeded categories in ID order', async () => {
    const response = await request(app).get('/api/categories').set(session.headers)

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ])
  })

  it('returns a JSON error when the database query fails', async () => {
    vi.spyOn(prisma.category, 'findMany').mockRejectedValueOnce(
      new Error('Database unavailable'),
    )

    const response = await request(app).get('/api/categories').set(session.headers)

    expect(response.status).toBe(500)
    expect(response.headers['content-type']).toMatch(/json/)
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    })
  })
})
