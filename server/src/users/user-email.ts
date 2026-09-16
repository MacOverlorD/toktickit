export const USER_EMAIL_MAX_LENGTH = 254

const localPartPattern = /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*$/
const domainLabelPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/

export function normalizeUserEmail(email: string) {
  return email.trim().toLowerCase()
}

export function userEmailValidationError(value: string): string | null {
  const email = normalizeUserEmail(value)
  if (email.length === 0 || email.length > USER_EMAIL_MAX_LENGTH) {
    return 'Enter a valid email address.'
  }

  const parts = email.split('@')
  if (parts.length !== 2) return 'Enter a valid email address.'

  const [localPart, domain] = parts
  if (
    localPart.length < 1 ||
    localPart.length > 64 ||
    !localPartPattern.test(localPart)
  ) {
    return 'Enter a valid email address.'
  }

  const labels = domain.split('.')
  if (
    labels.length < 2 ||
    labels.some((label) => !domainLabelPattern.test(label))
  ) {
    return 'Enter a valid email address.'
  }

  return null
}
