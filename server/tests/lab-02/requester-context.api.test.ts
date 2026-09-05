import express from 'express'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../../src/errors/error-handler.js'
import prisma from '../../src/prisma.js'
import { requireDevelopmentRequester } from '../../src/requesters/requester-context.js'

const contextApp = express()

contextApp.get('/protected', requireDevelopmentRequester, (_request, response) => {
  response.status(200).json(response.locals.developmentRequester)
})
contextApp.use(errorHandler)

let activeRequesterId: number
let inactiveRequesterId: number

beforeAll(async () => {
  const [activeRequester, inactiveRequester] = await Promise.all([
    prisma.requester.findUniqueOrThrow({
      where: { email: 'anan.wong@example.test' },
      select: { id: true },
    }),
    prisma.requester.findUniqueOrThrow({
      where: { email: 'former.requester@example.test' },
      select: { id: true },
    }),
  ])

  activeRequesterId = activeRequester.id
  inactiveRequesterId = inactiveRequester.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('development requester context middleware', () => {
  it('accepts one active requester ID and exposes only the public requester shape', async () => {
    const response = await request(contextApp)
      .get('/protected')
      .set('X-Development-Requester-Id', String(activeRequesterId))

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      id: activeRequesterId,
      name: 'Anan Wong',
      email: 'anan.wong@example.test',
    })
  })

  it.each([
    ['missing', undefined],
    ['malformed', 'abc'],
    ['zero', '0'],
    ['negative', '-1'],
    ['decimal', '1.5'],
    ['non-canonical', '01'],
    ['unsafe integer', '9007199254740992'],
  ])('rejects a %s requester header', async (_case, value) => {
    const pendingRequest = request(contextApp).get('/protected')
    if (value !== undefined) {
      pendingRequest.set('X-Development-Requester-Id', value)
    }

    const response = await pendingRequest

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUESTER_CONTEXT',
        message: 'Select an active Development Requester.',
      },
    })
  })

  it('rejects repeated requester headers', async () => {
    const response = await request(contextApp)
      .get('/protected')
      .set('X-Development-Requester-Id', [
        String(activeRequesterId),
        String(activeRequesterId),
      ])

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_REQUESTER_CONTEXT')
  })

  it.each([
    ['inactive', () => inactiveRequesterId],
    ['missing', () => 2_147_483_647],
  ])('rejects an %s requester record', async (_case, requesterId) => {
    const response = await request(contextApp)
      .get('/protected')
      .set('X-Development-Requester-Id', String(requesterId()))

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_REQUESTER_CONTEXT')
  })

  it('does not leak database failures while validating context', async () => {
    vi.spyOn(prisma.requester, 'findFirst').mockRejectedValueOnce(
      new Error('sensitive requester lookup failure'),
    )

    const response = await request(contextApp)
      .get('/protected')
      .set('X-Development-Requester-Id', String(activeRequesterId))

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    })
    expect(JSON.stringify(response.body)).not.toContain('sensitive requester lookup failure')
  })
})
