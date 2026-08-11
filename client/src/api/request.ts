export const API_REQUEST_TIMEOUT_MS = 8_000

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

export async function apiFetch(path: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(`${apiUrl}${path}`, {
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
