import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import { errorHandler } from '../../src/errors/error-handler.js'

describe('Lab 2 safe JSON error contract', () => {
  it('returns JSON for an unknown API route', async () => {
    const response = await request(app).get('/api/not-a-real-route')

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(/application\/json/)
    expect(response.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'API route was not found.',
      },
    })
  })

  it('returns a field-safe JSON response for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Content-Type', 'application/json')
      .send('{"summary":')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Provide a valid JSON request body.',
        fieldErrors: { body: 'Provide valid JSON.' },
      },
    })
  })

  it('hides exception details behind the generic JSON error', async () => {
    const isolatedApp = express()
    isolatedApp.get('/boom', () => {
      throw new Error('private database details')
    })
    isolatedApp.use(errorHandler)

    const response = await request(isolatedApp).get('/boom')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    })
    expect(response.text).not.toContain('private database details')
  })
})
