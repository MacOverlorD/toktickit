import { apiFetch } from './request'

export interface DevelopmentRequester {
  id: number
  name: string
  email: string
}

function isDevelopmentRequester(value: unknown): value is DevelopmentRequester {
  if (!value || typeof value !== 'object') return false

  const requester = value as Record<string, unknown>
  return (
    Number.isSafeInteger(requester.id) &&
    Number(requester.id) > 0 &&
    typeof requester.name === 'string' &&
    requester.name.length > 0 &&
    typeof requester.email === 'string' &&
    requester.email.length > 0
  )
}

export async function getDevelopmentRequesters() {
  const response = await apiFetch('/api/development-requesters')

  if (!response.ok) {
    throw new Error('Unable to load Development Requesters.')
  }

  const body: unknown = await response.json()
  if (!Array.isArray(body) || !body.every(isDevelopmentRequester)) {
    throw new Error('The Development Requester response is invalid.')
  }

  return body.map(({ id, name, email }) => ({ id, name, email }))
}
