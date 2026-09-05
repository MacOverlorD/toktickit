import { describe, expect, it } from 'vitest'
import {
  generateTicketNumber,
  TICKET_NUMBER_PATTERN,
} from '../../src/tickets/ticket-identity.js'

describe('Ticket Number generation', () => {
  it('uses the UTC date and an uppercase eight-character hex suffix', () => {
    const ticketNumber = generateTicketNumber(
      new Date('2026-09-01T23:30:00-07:00'),
      () => Uint8Array.from([0xab, 0xcd, 0x12, 0x34]),
    )

    expect(ticketNumber).toBe('TKT-20260902-ABCD1234')
    expect(ticketNumber).toMatch(TICKET_NUMBER_PATTERN)
  })

  it('generates different numbers when the random source changes', () => {
    const date = new Date('2026-09-01T00:00:00.000Z')

    expect(
      generateTicketNumber(date, () => Uint8Array.from([0, 0, 0, 1])),
    ).not.toBe(
      generateTicketNumber(date, () => Uint8Array.from([0, 0, 0, 2])),
    )
  })

  it('rejects an invalid generation date', () => {
    expect(() => generateTicketNumber(new Date('invalid'))).toThrow(RangeError)
  })
})
