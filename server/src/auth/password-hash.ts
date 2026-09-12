import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import { assertValidPassword } from './password-policy.js'

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const

export async function hashPassword(password: string) {
  assertValidPassword(password)
  return argon2.hash(password, {
    ...ARGON2_OPTIONS,
    salt: randomBytes(16),
  })
}

export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export function passwordHashNeedsRehash(hash: string) {
  try {
    return argon2.needsRehash(hash, ARGON2_OPTIONS)
  } catch {
    return false
  }
}
