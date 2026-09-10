import { describe, expect, it } from 'vitest'
import {
  PASSWORD_MAX_CODE_POINTS,
  PASSWORD_MIN_CODE_POINTS,
  passwordValidationError,
} from '../../src/auth/password-policy.js'
import {
  ARGON2_OPTIONS,
  hashPassword,
  verifyPassword,
} from '../../src/auth/password-hash.js'

describe('Lab 3 password foundation', () => {
  it('enforces the documented Unicode length and byte boundaries', () => {
    expect(passwordValidationError('a'.repeat(PASSWORD_MIN_CODE_POINTS))).toBeNull()
    expect(passwordValidationError('a'.repeat(PASSWORD_MIN_CODE_POINTS - 1))).not.toBeNull()
    expect(passwordValidationError('a'.repeat(PASSWORD_MAX_CODE_POINTS + 1))).not.toBeNull()
    expect(passwordValidationError(' '.repeat(PASSWORD_MIN_CODE_POINTS))).not.toBeNull()
    expect(passwordValidationError('\uD800'.repeat(PASSWORD_MIN_CODE_POINTS))).not.toBeNull()
  })

  it('uses Argon2id and verifies only the correct password', async () => {
    const password = 'correct horse battery staple'
    const hash = await hashPassword(password)

    expect(hash).toMatch(/^\$argon2id\$/)
    expect(ARGON2_OPTIONS.memoryCost).toBeGreaterThanOrEqual(19_456)
    await expect(verifyPassword(hash, password)).resolves.toBe(true)
    await expect(verifyPassword(hash, 'incorrect horse battery staple')).resolves.toBe(false)
  })
})
