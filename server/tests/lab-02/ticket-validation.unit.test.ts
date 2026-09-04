import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/errors/api-error.js'
import { validateCreateTicketBody } from '../../src/tickets/ticket-validation.js'

function validBody() {
  return {
    categoryId: 1,
    relatedSystemId: 2,
    summary: '  Printer is unavailable  ',
    requestedPriority: 'HIGH',
    description: '  The office printer cannot be reached from my laptop.  ',
  }
}

function validationError(body: unknown) {
  try {
    validateCreateTicketBody(body)
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }
  throw new Error('Expected ticket validation to fail.')
}

describe('Lab 2 ticket input validation', () => {
  it('trims valid text and returns only normalized accepted fields', () => {
    expect(validateCreateTicketBody(validBody())).toEqual({
      categoryId: 1,
      relatedSystemId: 2,
      summary: 'Printer is unavailable',
      requestedPriority: 'HIGH',
      description: 'The office printer cannot be reached from my laptop.',
    })
  })

  it.each([null, [], 'ticket'])('rejects a non-object body: %j', (body) => {
    expect(validationError(body).fieldErrors).toEqual({
      body: 'Provide a JSON object for the ticket.',
    })
  })

  it('rejects unknown and server-assigned fields', () => {
    const error = validationError({
      ...validBody(),
      unexpected: true,
      requesterId: 99,
    })
    expect(error.fieldErrors).toMatchObject({
      unexpected: 'This field is not accepted.',
      requesterId: expect.stringContaining('assigned by the server'),
    })
  })

  it('rejects invalid identifiers and priority values', () => {
    const error = validationError({
      ...validBody(),
      categoryId: 0,
      relatedSystemId: 1.5,
      requestedPriority: 'CRITICAL',
    })
    expect(error.fieldErrors).toMatchObject({
      categoryId: expect.any(String),
      relatedSystemId: expect.any(String),
      requestedPriority: expect.any(String),
    })
  })

  it('applies text limits after trimming', () => {
    const error = validationError({
      ...validBody(),
      summary: '  four  ',
      description: ' '.repeat(2) + 'x'.repeat(5_001),
    })
    expect(error.fieldErrors).toMatchObject({
      summary: expect.stringContaining('5-120'),
      description: expect.stringContaining('10-5,000'),
    })
  })
})
