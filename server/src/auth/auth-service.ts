import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { Prisma, type UserRole } from '@prisma/client'
import { ApiError } from '../errors/api-error.js'
import { isSerializationConflict } from '../errors/prisma-errors.js'
import prisma from '../prisma.js'
import {
  hashPassword,
  passwordHashNeedsRehash,
  verifyPassword,
} from './password-hash.js'
import { passwordValidationError } from './password-policy.js'
import {
  normalizeUserEmail,
  userEmailValidationError,
} from '../users/user-email.js'
import { loginRateLimiter } from './login-rate-limit.js'
import type { AuthResult, ResolvedSession, UserSummary } from './auth-types.js'

const NORMAL_ABSOLUTE_MS = 8 * 60 * 60 * 1000
const RESTRICTED_ABSOLUTE_MS = 15 * 60 * 1000
const IDLE_MS = 30 * 60 * 1000
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const DUMMY_PASSWORD = 'dummy password for timing checks'
const dummyHashPromise = hashPassword(DUMMY_PASSWORD)

interface LockedUser {
  id: number
  name: string
  email: string
  role: UserRole
  isActive: boolean
  passwordHash: string | null
  mustChangePassword: boolean
  version: number
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function safeStringMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function summary(user: LockedUser): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    version: user.version,
  }
}

function invalidCredentials() {
  return new ApiError(
    401,
    'INVALID_CREDENTIALS',
    'Cannot sign in with these credentials. Check your details or contact an Administrator.',
  )
}

function unauthenticated() {
  return new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
}

function validateLoginPassword(value: unknown): value is string {
  return typeof value === 'string' && passwordValidationError(value) === null
}

async function lockUser(
  transaction: Prisma.TransactionClient,
  userId: number,
) {
  const rows = await transaction.$queryRawUnsafe<LockedUser[]>(
    'SELECT "id", "name", "email", "role", "isActive", "passwordHash", "mustChangePassword", "version" FROM "User" WHERE "id" = $1 FOR UPDATE',
    userId,
  )
  return rows[0] ?? null
}

function newSessionData(userId: number, restricted: boolean, now: Date) {
  const sessionToken = randomBytes(32).toString('base64url')
  const tokenHash = sha256(sessionToken)
  const csrfToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(
    now.getTime() +
      (restricted ? RESTRICTED_ABSOLUTE_MS : NORMAL_ABSOLUTE_MS),
  )
  return {
    sessionToken,
    tokenHash,
    csrfToken,
    expiresAt,
    data: {
      tokenHash,
      userId,
      csrfToken,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
    },
  }
}

export function sessionTokenHash(cookieValue: string | null) {
  if (!cookieValue || !SESSION_TOKEN_PATTERN.test(cookieValue)) return null
  return sha256(cookieValue)
}

export function csrfTokenMatches(expected: string, supplied: string | undefined) {
  return typeof supplied === 'string' && safeStringMatch(expected, supplied)
}

export async function login(
  emailInput: unknown,
  passwordInput: unknown,
  ipAddress: string,
  previousCookieValue: string | null,
): Promise<AuthResult> {
  if (
    typeof emailInput !== 'string' ||
    userEmailValidationError(emailInput) ||
    !validateLoginPassword(passwordInput)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid email and password.',
      {
        ...(typeof emailInput !== 'string' || userEmailValidationError(String(emailInput ?? ''))
          ? { email: 'Enter a valid email address.' }
          : {}),
        ...(!validateLoginPassword(passwordInput)
          ? { password: 'Enter a valid password.' }
          : {}),
      },
    )
  }

  const email = normalizeUserEmail(emailInput)
  const password = passwordInput
  loginRateLimiter.check(email, ipAddress)

  const snapshot = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      mustChangePassword: true,
      version: true,
    },
  })
  const comparisonHash = snapshot?.passwordHash ?? (await dummyHashPromise)
  const passwordValid = await verifyPassword(comparisonHash, password)
  if (!snapshot || !snapshot.isActive || !snapshot.passwordHash || !passwordValid) {
    loginRateLimiter.recordFailure(email, ipAddress)
    throw invalidCredentials()
  }

  const replacementHash = passwordHashNeedsRehash(snapshot.passwordHash)
    ? await hashPassword(password)
    : null
  const previousTokenHash = sessionTokenHash(previousCookieValue)
  const now = new Date()

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const current = await lockUser(transaction, snapshot.id)
        if (
          !current ||
          !current.isActive ||
          !current.passwordHash ||
          current.version !== snapshot.version ||
          current.passwordHash !== snapshot.passwordHash
        ) {
          throw invalidCredentials()
        }

        if (replacementHash) {
          await transaction.user.update({
            where: { id: current.id },
            data: {
              passwordHash: replacementHash,
              version: { increment: 1 },
            },
          })
          current.passwordHash = replacementHash
          current.version += 1
        }

        if (previousTokenHash) {
          await transaction.session.deleteMany({
            where: { tokenHash: previousTokenHash },
          })
        }

        const created = newSessionData(
          current.id,
          current.mustChangePassword,
          now,
        )
        await transaction.session.create({ data: created.data })
        return { ...created, user: summary(current) }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    loginRateLimiter.clearEmail(email)
    return result
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (isSerializationConflict(error)) {
      throw invalidCredentials()
    }
    throw error
  }
}

export async function resolveSession(
  cookieValue: string | null,
): Promise<ResolvedSession | null> {
  const tokenHash = sessionTokenHash(cookieValue)
  if (!tokenHash) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          passwordHash: true,
          mustChangePassword: true,
          version: true,
        },
      },
    },
  })
  if (!session) return null

  const now = new Date()
  const idleExpired =
    now.getTime() - session.lastSeenAt.getTime() >= IDLE_MS
  if (
    session.expiresAt <= now ||
    idleExpired ||
    !session.user.isActive ||
    !session.user.passwordHash
  ) {
    await prisma.session.deleteMany({ where: { tokenHash } })
    return null
  }

  const touched = await prisma.session.updateMany({
    where: {
      tokenHash,
      expiresAt: { gt: now },
      lastSeenAt: { gt: new Date(now.getTime() - IDLE_MS) },
    },
    data: { lastSeenAt: now },
  })
  if (touched.count !== 1) return null

  return {
    tokenHash,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
    user: summary(session.user),
  }
}

export async function changePassword(
  session: ResolvedSession,
  currentPasswordInput: unknown,
  newPasswordInput: unknown,
  confirmPasswordInput: unknown,
): Promise<AuthResult> {
  if (
    typeof currentPasswordInput !== 'string' ||
    typeof newPasswordInput !== 'string' ||
    typeof confirmPasswordInput !== 'string'
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check the highlighted password fields.',
      { currentPassword: 'Enter the current password.' },
    )
  }

  const snapshot = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      mustChangePassword: true,
      version: true,
    },
  })
  if (
    !snapshot?.passwordHash ||
    !(await verifyPassword(snapshot.passwordHash, currentPasswordInput))
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check the highlighted password fields.',
      { currentPassword: 'The current password is incorrect.' },
    )
  }

  const fieldErrors: Record<string, string> = {}
  const policyError = passwordValidationError(newPasswordInput)
  if (policyError) fieldErrors.newPassword = policyError
  if (newPasswordInput !== confirmPasswordInput) {
    fieldErrors.confirmPassword = 'Password confirmation must match.'
  }
  if (await verifyPassword(snapshot.passwordHash, newPasswordInput)) {
    fieldErrors.newPassword = 'Choose a password different from the current password.'
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check the highlighted password fields.',
      fieldErrors,
    )
  }

  const newPasswordHash = await hashPassword(newPasswordInput)
  const now = new Date()

  try {
    return await prisma.$transaction(
      async (transaction) => {
      const current = await lockUser(transaction, snapshot.id)
      const lockedSessions = await transaction.$queryRawUnsafe<
        Array<{ tokenHash: string }>
      >(
        'SELECT "tokenHash" FROM "Session" WHERE "tokenHash" = $1 FOR UPDATE',
        session.tokenHash,
      )
      if (lockedSessions.length === 0) throw unauthenticated()
      if (
        !current ||
        !current.isActive ||
        !current.passwordHash ||
        current.version !== snapshot.version ||
        current.passwordHash !== snapshot.passwordHash
      ) {
        throw new ApiError(
          409,
          'STALE_RESOURCE',
          'Account credentials changed. Sign in again.',
        )
      }

      await transaction.session.deleteMany({ where: { userId: current.id } })
      const updated = await transaction.user.update({
        where: { id: current.id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          version: { increment: 1 },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          passwordHash: true,
          mustChangePassword: true,
          version: true,
        },
      })
      const created = newSessionData(updated.id, false, now)
      await transaction.session.create({ data: created.data })
      return { ...created, user: summary(updated) }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (isSerializationConflict(error)) {
      throw new ApiError(
        409,
        'STALE_RESOURCE',
        'Account credentials changed. Sign in again.',
      )
    }
    throw error
  }
}

export async function logout(session: ResolvedSession) {
  await prisma.session.deleteMany({
    where: { tokenHash: session.tokenHash },
  })
}
