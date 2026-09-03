import type { ErrorRequestHandler } from 'express'
import { ApiError } from './api-error.js'

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (
    error instanceof SyntaxError &&
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json(
      new ApiError(
        400,
        'VALIDATION_ERROR',
        'Provide a valid JSON request body.',
        { body: 'Provide valid JSON.' },
      ).toResponseBody(),
    )
    return
  }

  if (error instanceof ApiError) {
    response.status(error.status).json(error.toResponseBody())
    return
  }

  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  })
}
