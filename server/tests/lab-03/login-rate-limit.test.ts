import { describe, expect, it } from 'vitest'
import { LoginRateLimiter } from '../../src/auth/login-rate-limit.js'

describe('LoginRateLimiter storage bounds', () => {
  it('globally removes expired identities before applying the bucket capacity', () => {
    const limiter = new LoginRateLimiter()
    const start = Date.UTC(2026, 8, 12)

    for (let index = 0; index < 5_000; index += 1) {
      limiter.recordFailure(
        `person-${index}@example.test`,
        `192.0.2.${index}`,
        start,
      )
    }

    expect(() =>
      limiter.recordFailure(
        'new-person@example.test',
        '198.51.100.1',
        start + 16 * 60 * 1_000,
      ),
    ).not.toThrow()
  })
})
