import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { E2E_PREFIX } from './database.js'

export const API_URL = 'http://localhost:3100'
export const REQUESTER_STORAGE_KEY = 'toktickit.devRequesterId'

export interface Requester {
  id: number
  name: string
  email: string
}

export async function requesters(request: APIRequestContext) {
  const response = await request.get(API_URL + '/api/development-requesters')
  expect(response.ok()).toBeTruthy()
  return response.json() as Promise<Requester[]>
}

export async function selectRequester(page: Page, requester: Requester) {
  await page.goto('/select-requester')
  await page.getByRole('combobox', { name: /Development Requester/ })
    .selectOption(String(requester.id))
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible()
}

export async function restoreRequester(page: Page, requesterId: number) {
  await page.addInitScript(
    ({ key, value }) => window.sessionStorage.setItem(key, value),
    { key: REQUESTER_STORAGE_KEY, value: String(requesterId) },
  )
}

export async function references(request: APIRequestContext) {
  const [categoriesResponse, systemsResponse] = await Promise.all([
    request.get(API_URL + '/api/categories'),
    request.get(API_URL + '/api/related-systems'),
  ])
  expect(categoriesResponse.ok()).toBeTruthy()
  expect(systemsResponse.ok()).toBeTruthy()
  const categories = await categoriesResponse.json() as Array<{ id: number; name: string }>
  const systems = await systemsResponse.json() as Array<{ id: number; name: string }>
  return { category: categories[0], system: systems[0] }
}

export async function createTicketFixture(
  request: APIRequestContext,
  requesterId: number,
  label: string,
) {
  const { category, system } = await references(request)
  const response = await request.post(API_URL + '/api/tickets', {
    headers: {
      'X-Development-Requester-Id': String(requesterId),
      'Idempotency-Key': randomUUID(),
    },
    data: {
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: `${E2E_PREFIX} ${label} ${randomUUID().slice(0, 8)}`,
      requestedPriority: 'MEDIUM',
      description: `${E2E_PREFIX} real PostgreSQL fixture for ${label}.`,
    },
  })
  expect(response.status()).toBe(201)
  return (await response.json() as {
    data: { ticketNumber: string; requesterId: number }
  }).data
}

export async function assertNoPageOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement
    const overflow = root.scrollWidth - root.clientWidth
    const outside = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((element) => {
        const style = getComputedStyle(element)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0
        ) return false
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && (
          rect.left < -1 ||
          rect.right > window.innerWidth + 1
        )
      })
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        text: element.textContent?.trim().slice(0, 60),
      }))
    return { overflow, outside }
  })
  expect(result.overflow).toBeLessThanOrEqual(0)
  expect(result.outside).toEqual([])
}

export const pdfFile = {
  name: 'e2e-evidence.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'),
}
