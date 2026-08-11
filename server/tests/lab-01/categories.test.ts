import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /api/categories', () => {
  it('returns the seeded categories in ID order', async () => {
    const response = await request(app).get('/api/categories')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ])
  })
})
