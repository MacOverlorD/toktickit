import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/errors/api-error.js'
import { parseTicketListQuery } from '../../src/tickets/ticket-query.js'

function expectInvalid(query: Record<string, unknown>) {
  expect(() => parseTicketListQuery(query)).toThrowError(
    expect.objectContaining({ status: 400, code: 'INVALID_QUERY' }) as ApiError,
  )
}

describe('Issue 16 ticket-list query parsing', () => {
  it('applies documented defaults', () => {
    expect(parseTicketListQuery({})).toEqual({
      search: null,
      categoryId: null,
      relatedSystemId: null,
      status: null,
      priority: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      pageSize: 10,
    })
  })

  it('trims search and parses every allowlisted value', () => {
    expect(
      parseTicketListQuery({
        search: '  VPN issue  ',
        categoryId: '2',
        relatedSystemId: '3',
        status: 'NEW',
        priority: 'HIGH',
        sortBy: 'summary',
        sortOrder: 'asc',
        page: '2',
        pageSize: '20',
      }),
    ).toEqual({
      search: 'VPN issue',
      categoryId: 2,
      relatedSystemId: 3,
      status: 'NEW',
      priority: 'HIGH',
      sortBy: 'summary',
      sortOrder: 'asc',
      page: 2,
      pageSize: 20,
    })
  })

  it.each([
    { unknown: 'value' },
    { search: '' },
    { search: '   ' },
    { search: 'x'.repeat(101) },
    { search: ['first', 'second'] },
    { categoryId: '0' },
    { relatedSystemId: '1.5' },
    { status: 'CLOSED' },
    { priority: 'CRITICAL' },
    { sortBy: 'requesterId' },
    { sortOrder: 'sideways' },
    { page: '-1' },
    { pageSize: '25' },
  ])('rejects invalid query %#', (query) => {
    expectInvalid(query)
  })
})
