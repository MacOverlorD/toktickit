import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../src/errors/api-error.js'
import {
  parseActionId,
  validateAssignment,
  validateCompletion,
  validateCreateAction,
  validateEditAction,
} from '../../src/actions/action-domain.js'

const now = new Date('2026-09-28T00:00:00.000Z')
const key = randomUUID()

function errorCode(work: () => unknown) {
  try {
    work()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }
  throw new Error('Expected validation to fail.')
}

describe('Lab 4 Action domain validation', () => {
  it('normalizes the canonical create payload and produces a stable fingerprint', () => {
    const first = validateCreateAction(
      {
        description: '  ตรวจสอบระบบ  ',
        actionAt: '2026-09-27T17:00:00-07:00',
        result: null,
        assignedToUserId: null,
        followUpRequired: true,
        followUpNote: '  ติดต่อผู้ใช้  ',
        attachmentNotes: null,
      },
      key.toUpperCase(),
      now,
    )
    const second = validateCreateAction(
      {
        description: 'ตรวจสอบระบบ',
        actionAt: '2026-09-28T00:00:00.000Z',
        followUpRequired: true,
        followUpNote: 'ติดต่อผู้ใช้',
      },
      key,
      now,
    )
    expect(first).toMatchObject({
      description: 'ตรวจสอบระบบ',
      actionAt: now,
      followUpNote: 'ติดต่อผู้ใช้',
      idempotencyKey: key,
    })
    expect(first.requestFingerprint).toBe(second.requestFingerprint)
  })

  it('enforces exact fields, Unicode bounds, conditional notes, IDs and future skew', () => {
    expect(errorCode(() => validateCreateAction({ description: 'x', followUpRequired: false, actorId: 1 }, key, now)).fieldErrors?.body).toBeDefined()
    expect(errorCode(() => validateCreateAction({ description: '\uD800', followUpRequired: false }, key, now)).fieldErrors?.description).toBeDefined()
    expect(errorCode(() => validateCreateAction({ description: 'x', followUpRequired: true }, key, now)).fieldErrors?.followUpNote).toBeDefined()
    expect(errorCode(() => validateCreateAction({ description: 'x', followUpRequired: false, followUpNote: 'unexpected' }, key, now)).fieldErrors?.followUpNote).toBeDefined()
    expect(errorCode(() => validateCreateAction({ description: 'x', followUpRequired: false, assignedToUserId: 0 }, key, now)).fieldErrors?.assignedToUserId).toBeDefined()
    expect(errorCode(() => validateCreateAction({ description: 'x', followUpRequired: false, actionAt: '2026-09-28T00:05:00.001Z' }, key, now)).fieldErrors?.actionAt).toBeDefined()
    expect(validateCreateAction({ description: '😀'.repeat(2000), followUpRequired: false, actionAt: '2026-09-28T00:05:00.000Z' }, key, now).description).toHaveLength(4000)
    expect(errorCode(() => validateCreateAction({ description: 'x'.repeat(2001), followUpRequired: false }, key, now)).fieldErrors?.description).toBeDefined()
    expect(validateCreateAction({ description: 'x', result: 'r'.repeat(4000), followUpRequired: false }, key, now).result).toHaveLength(4000)
    expect(errorCode(() => validateCreateAction({ description: 'x', result: 'r'.repeat(4001), followUpRequired: false }, key, now)).fieldErrors?.result).toBeDefined()
    expect(validateCreateAction({ description: 'x', followUpRequired: true, followUpNote: 'n'.repeat(1000) }, key, now).followUpNote).toHaveLength(1000)
    expect(errorCode(() => validateCreateAction({ description: 'x', followUpRequired: true, followUpNote: 'n'.repeat(1001) }, key, now)).fieldErrors?.followUpNote).toBeDefined()
    expect(validateCreateAction({ description: 'x', followUpRequired: false, attachmentNotes: 'a'.repeat(1000) }, key, now).attachmentNotes).toHaveLength(1000)
    expect(errorCode(() => validateCreateAction({ description: 'x', followUpRequired: false, attachmentNotes: ' ' }, key, now)).fieldErrors?.attachmentNotes).toBeDefined()
  })

  it('validates edit, assignment, completion and positive identifiers', () => {
    const current = {
      actionAt: null,
      description: 'Existing',
      result: null,
      followUpRequired: true,
      followUpNote: 'Existing note',
      attachmentNotes: null,
    }
    expect(validateEditAction({ followUpRequired: false, followUpNote: null, expectedVersion: 2 }, current, now)).toMatchObject({
      expectedVersion: 2,
      data: { followUpRequired: false, followUpNote: null },
    })
    expect(errorCode(() => validateEditAction({ expectedVersion: 2 }, current, now)).fieldErrors?.body).toBeDefined()
    expect(validateAssignment({ assignedToUserId: null, expectedVersion: 1 })).toEqual({ assignedToId: null, expectedVersion: 1 })
    expect(validateCompletion({ expectedVersion: 3, result: '  done  ' }, now)).toEqual({ expectedVersion: 3, result: 'done', actionAt: now })
    expect(parseActionId('42')).toBe(42)
    expect(errorCode(() => parseActionId('0')).fieldErrors?.actionId).toBeDefined()
  })
})
