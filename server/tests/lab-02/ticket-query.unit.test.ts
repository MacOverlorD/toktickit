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
      scope: null,
      asOf: null,
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
      scope: null,
      asOf: null,
      priority: 'HIGH',
      sortBy: 'summary',
      sortOrder: 'asc',
      page: 2,
      pageSize: 20,
    })
  })

  it.each([
    'NEW',
    'OPEN',
    'IN_PROGRESS',
    'WAITING_FOR_REQUESTER',
    'RESOLVED',
    'CLOSED',
    'REOPENED',
    'CANCELLED',
  ])('accepts the approved exact status %s', (status) => {
    expect(parseTicketListQuery({ status })).toEqual(
      expect.objectContaining({ status, scope: null, asOf: null }),
    )
  })

  it('parses both dashboard scopes and the canonical recently-resolved asOf', () => {
    const asOf = '2026-10-08T12:00:00.000Z'
    expect(parseTicketListQuery({ scope: 'open' })).toEqual(
      expect.objectContaining({ scope: 'open', asOf: null, status: null }),
    )
    expect(parseTicketListQuery({ scope: 'recently-resolved', asOf })).toEqual(
      expect.objectContaining({
        scope: 'recently-resolved',
        asOf: new Date(asOf),
        status: null,
      }),
    )
  })

  it.each([
    { unknown: 'value' },
    { search: '' },
    { search: '   ' },
    { search: 'x'.repeat(101) },
    { search: ['first', 'second'] },
    { categoryId: '0' },
    { categoryId: '2147483648' },
    { relatedSystemId: '1.5' },
    { relatedSystemId: '2147483648' },
    { status: 'UNKNOWN' },
    { scope: 'unknown' },
    { scope: 'recently-resolved' },
    { asOf: '2026-10-08T12:00:00.000Z' },
    { scope: 'open', status: 'NEW' },
    { scope: 'recently-resolved', asOf: '2026-10-08' },
    { priority: 'CRITICAL' },
    { sortBy: 'requesterId' },
    { sortOrder: 'sideways' },
    { page: '-1' },
    { pageSize: '25' },
    { page: '42949674', pageSize: '50' },
  ])('rejects invalid query %#', (query) => {
    expectInvalid(query)
  })
})
