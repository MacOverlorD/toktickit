import { API_REQUEST_TIMEOUT_MS, apiFetch } from './request'

export type HealthResponse = {
  status: 'ok'
  service: 'TokTickIT API'
}

export const HEALTH_REQUEST_TIMEOUT_MS = API_REQUEST_TIMEOUT_MS

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>

  return response.status === 'ok' && response.service === 'TokTickIT API'
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await apiFetch('/api/health')

  if (!response.ok) {
    throw new Error('Health request failed')
  }

  const data: unknown = await response.json()

  if (!isHealthResponse(data)) {
    throw new Error('Health response is invalid')
  }

  return data
}
