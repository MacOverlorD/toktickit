import type { ErrorRequestHandler } from 'express'
import multer from 'multer'
import { ApiError } from './api-error.js'

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    response.status(413).json(
      new ApiError(
        413,
        'PAYLOAD_TOO_LARGE',
        'The JSON request body is too large.',
      ).toResponseBody(),
    )
    return
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE'
    response.status(tooLarge ? 413 : 400).json({
      error: {
        code: tooLarge ? 'ATTACHMENT_TOO_LARGE' : 'ATTACHMENT_INVALID',
        message: tooLarge
          ? 'Attachment must not exceed 5 MiB.'
          : 'Provide exactly one file using the file field.',
      },
    })
    return
  }
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
