import { randomBytes } from 'node:crypto'

export const TICKET_NUMBER_PATTERN = /^TKT-\d{8}-[A-F0-9]{8}$/

type RandomByteSource = (size: number) => Uint8Array

const defaultRandomByteSource: RandomByteSource = (size) => randomBytes(size)

export function generateTicketNumber(
  now: Date = new Date(),
  randomByteSource: RandomByteSource = defaultRandomByteSource,
) {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Ticket number date must be valid.')
  }

  const date = [
    now.getUTCFullYear().toString().padStart(4, '0'),
    (now.getUTCMonth() + 1).toString().padStart(2, '0'),
    now.getUTCDate().toString().padStart(2, '0'),
  ].join('')
  const suffix = Buffer.from(randomByteSource(4)).toString('hex').toUpperCase()

  return `TKT-${date}-${suffix}`
}
