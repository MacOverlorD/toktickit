import { describe, expect, it } from 'vitest'
import { normalizeRequesterEmail } from '../../src/requesters/requester-email.js'

describe('Requester email normalization', () => {
  it('trims surrounding whitespace and lowercases the natural key', () => {
    expect(normalizeRequesterEmail('  Foo.Bar@Example.COM  ')).toBe(
      'foo.bar@example.com',
    )
  })

  it('is idempotent for an already canonical email', () => {
    const email = 'foo.bar@example.com'

    expect(normalizeRequesterEmail(normalizeRequesterEmail(email))).toBe(email)
  })
})
