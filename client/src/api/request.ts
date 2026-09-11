export const API_REQUEST_TIMEOUT_MS = 8_000

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

let csrfToken: string | null = null

export function setApiCsrfToken(value: string | null) {
  csrfToken = value
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  try {
    const response = await fetch(apiUrl + path, {
      ...init,
      credentials: 'include',
      headers,
      signal: controller.signal,
    })
    if (
      response.status === 401 &&
      path !== '/api/auth/login' &&
      path !== '/api/auth/me'
    ) {
      window.dispatchEvent(new Event('toktickit:unauthenticated'))
    }
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
