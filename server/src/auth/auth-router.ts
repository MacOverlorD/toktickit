import express, { type RequestHandler } from 'express'
import { ApiError } from '../errors/api-error.js'
import {
  changePassword,
  csrfTokenMatches,
  login,
  logout,
  resolveSession,
} from './auth-service.js'
import {
  authResponse,
  clearSessionCookie,
  sessionCookie,
  setSessionCookie,
} from './auth-http.js'

export const authRouter = express.Router()

function trustedOrigin(request: express.Request) {
  return request.header('origin') ===
    (process.env.CLIENT_URL ?? 'http://localhost:5173')
}

function requireOrigin(request: express.Request) {
  if (!trustedOrigin(request)) {
    throw new ApiError(
      403,
      'CSRF_INVALID',
      'The request origin is not permitted.',
    )
  }
}

function requireJson(request: express.Request) {
  if (!request.is('application/json')) {
    throw new ApiError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Use application/json for this request.',
    )
  }
}

function rejectUnknownFields(
  body: unknown,
  allowed: readonly string[],
) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a valid JSON request body.')
  }
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'The request contains unknown fields.',
    )
  }
}

const noStore: RequestHandler = (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
}

authRouter.use(noStore)

authRouter.post('/login', async (request, response, next) => {
  try {
    requireOrigin(request)
    requireJson(request)
    rejectUnknownFields(request.body, ['email', 'password'])
    const result = await login(
      request.body.email,
      request.body.password,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
      sessionCookie(request),
    )
    setSessionCookie(response, result)
    response.status(200).json(authResponse(result))
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', async (request, response, next) => {
  try {
    if (Object.keys(request.query).length > 0) {
      throw new ApiError(400, 'INVALID_QUERY', 'This endpoint does not accept query parameters.')
    }
    const session = await resolveSession(sessionCookie(request))
    if (!session) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
    }
    response.status(200).json({
      user: session.user,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt.toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/change-password', async (request, response, next) => {
  try {
    requireOrigin(request)
    requireJson(request)
    rejectUnknownFields(request.body, [
      'currentPassword',
      'newPassword',
      'confirmPassword',
    ])
    const session = await resolveSession(sessionCookie(request))
    if (!session) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
    }
    if (!csrfTokenMatches(session.csrfToken, request.header('X-CSRF-Token'))) {
      throw new ApiError(403, 'CSRF_INVALID', 'The request could not be verified.')
    }
    const result = await changePassword(
      session,
      request.body.currentPassword,
      request.body.newPassword,
      request.body.confirmPassword,
    )
    setSessionCookie(response, result)
    response.status(200).json(authResponse(result))
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', async (request, response, next) => {
  try {
    requireOrigin(request)
    const session = await resolveSession(sessionCookie(request))
    if (session) {
      if (!csrfTokenMatches(session.csrfToken, request.header('X-CSRF-Token'))) {
        throw new ApiError(403, 'CSRF_INVALID', 'The request could not be verified.')
      }
      await logout(session)
    }
    clearSessionCookie(response)
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})
