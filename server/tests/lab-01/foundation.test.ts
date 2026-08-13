import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../../src/app.js'

describe('project foundation', () => {
  it('starts the Express application', async () => {
    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ service: 'TokTickIT API' })
  })
})
