import type { RequestHandler } from 'express'
import type { UserRole } from '@prisma/client'
import { ApiError } from '../errors/api-error.js'
import { csrfTokenMatches, resolveSession } from './auth-service.js'
import { sessionCookie } from './auth-http.js'
import type { ResolvedSession } from './auth-types.js'

export function authSession(response: Parameters<RequestHandler>[1]) {
  return response.locals.authSession as ResolvedSession
}

export const requireAuthenticatedSession: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const session = await resolveSession(sessionCookie(request))
    if (!session) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.'))
      return
    }
    response.set('Cache-Control', 'no-store')
    response.locals.authSession = session
    next()
  } catch (error) {
    next(error)
  }
}

export const requireCompletedPassword: RequestHandler = (
  _request,
  response,
  next,
) => {
  if (authSession(response).user.mustChangePassword) {
    next(
      new ApiError(
        403,
        'PASSWORD_CHANGE_REQUIRED',
        'Change your initial password to continue.',
      ),
    )
    return
  }
  next()
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (_request, response, next) => {
    if (!roles.includes(authSession(response).user.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'))
      return
    }
    next()
  }
}

export const requireMutationCsrf: RequestHandler = (
  request,
  response,
  next,
) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next()
    return
  }

  const trustedOrigin = process.env.CLIENT_URL ?? 'http://localhost:5173'
  if (
    request.header('origin') !== trustedOrigin ||
    !csrfTokenMatches(
      authSession(response).csrfToken,
      request.header('X-CSRF-Token'),
    )
  ) {
    next(
      new ApiError(
        403,
        'CSRF_INVALID',
        'The request could not be verified.',
      ),
    )
    return
  }

  next()
}
