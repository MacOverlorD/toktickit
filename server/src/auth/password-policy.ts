export const PASSWORD_MIN_CODE_POINTS = 15
export const PASSWORD_MAX_CODE_POINTS = 128
export const PASSWORD_MAX_UTF8_BYTES = 512

export function passwordValidationError(password: string): string | null {
  if (/[\uD800-\uDFFF]/u.test(password)) {
    return 'Password contains an invalid Unicode character.'
  }

  const codePoints = [...password].length
  if (
    codePoints < PASSWORD_MIN_CODE_POINTS ||
    codePoints > PASSWORD_MAX_CODE_POINTS ||
    Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_UTF8_BYTES ||
    password.trim().length === 0
  ) {
    return 'Password must contain 15 to 128 characters and no more than 512 UTF-8 bytes.'
  }

  return null
}

export function assertValidPassword(password: string) {
  const error = passwordValidationError(password)
  if (error) throw new Error(error)
}
