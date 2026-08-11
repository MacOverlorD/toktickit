import { apiFetch } from './request'

export type Category = {
  id: number
  name: string
}

function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const category = value as Record<string, unknown>

  return (
    Number.isInteger(category.id) &&
    Number(category.id) > 0 &&
    typeof category.name === 'string' &&
    category.name.trim().length > 0
  )
}

export async function getCategories(): Promise<Category[]> {
  const response = await apiFetch('/api/categories')

  if (!response.ok) {
    throw new Error('Category request failed')
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data) || !data.every(isCategory)) {
    throw new Error('Category response is invalid')
  }

  return data
}
