import type { Request, Response } from 'express'
import type { AuthResult } from './auth-types.js'

export const SESSION_COOKIE_NAME = 'toktickit.sid'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function sessionCookie(request: Request) {
  const header = request.header('cookie')
  if (!header) return null

  for (const item of header.split(';')) {
    const separator = item.indexOf('=')
    if (separator < 0) continue
    const name = item.slice(0, separator).trim()
    if (name !== SESSION_COOKIE_NAME) continue
    try {
      return decodeURIComponent(item.slice(separator + 1))
    } catch {
      return null
    }
  }
  return null
}

export function setSessionCookie(response: Response, result: AuthResult) {
  response.cookie(SESSION_COOKIE_NAME, result.sessionToken, cookieOptions)
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions)
}

export function authResponse(result: AuthResult) {
  return {
    user: result.user,
    csrfToken: result.csrfToken,
    expiresAt: result.expiresAt.toISOString(),
  }
}
