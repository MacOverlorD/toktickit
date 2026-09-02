import { apiFetch } from './request'

export type RelatedSystem = {
  id: number
  name: string
}

function isRelatedSystem(value: unknown): value is RelatedSystem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    Number.isInteger(item.id) &&
    Number(item.id) > 0 &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0
  )
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const response = await apiFetch('/api/related-systems')
  if (!response.ok) throw new Error('Related System request failed')

  const data: unknown = await response.json()
  if (!Array.isArray(data) || !data.every(isRelatedSystem)) {
    throw new Error('Related System response is invalid')
  }
  return data
}
