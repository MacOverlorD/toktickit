export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string>
  }
}

export interface ApiErrorMetadata {
  retryAfterSeconds?: number
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string>
  readonly metadata?: ApiErrorMetadata

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string>,
    metadata?: ApiErrorMetadata,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.metadata = metadata
  }

  toResponseBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
      },
    }
  }
}
