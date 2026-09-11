import type { RequestHandler } from 'express'
import { ApiError } from '../errors/api-error.js'
import { authSession } from '../auth/auth-middleware.js'

export const requireRequester: RequestHandler = (
  _request,
  response,
  next,
) => {
  const user = authSession(response).user
  if (user.role !== 'REQUESTER') {
    next(
      new ApiError(
        403,
        'FORBIDDEN',
        'Requester access is required.',
      ),
    )
    return
  }

  response.locals.requester = {
    id: user.id,
    name: user.name,
    email: user.email,
  }
  next()
}
