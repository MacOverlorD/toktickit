import { expect, test, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import {
  API_URL,
  assertNoPageOverflow,
  createTicketFixture,
  pdfFile,
  requesters,
  restoreRequester,
  selectRequester,
} from './helpers.js'
import { EMPTY_REQUESTER_EMAIL } from './database.js'

const screenshotRoot = process.env.PROMOTE_E2E_EVIDENCE === '1'
  ? 'artifacts/lab-02/screenshots'
  : 'artifacts/lab-02/test-results/visual-captures'

async function screenshot(page: Page, path: string) {
  await assertNoPageOverflow(page)
  await page.screenshot({
    path: `${screenshotRoot}/${path}`,
    fullPage: true,
  })
}

async function fillValidTicket(page: Page, suffix: string) {
  await page.getByRole('combobox', { name: /Category/ })
    .selectOption({ label: 'Hardware' })
  await page.getByRole('combobox', { name: /Related System/ })
    .selectOption({ label: 'Corporate Laptop' })
  await page.getByRole('textbox', { name: /Ticket Summary/ })
    .fill('[E2E] Visual ticket ' + suffix)
  await page.getByRole('combobox', { name: /Requested Priority/ })
    .selectOption('HIGH')
  await page.getByRole('textbox', { name: /Description/ })
    .fill('[E2E] Values remain visible when the simulated API request fails.')
}

test('captures requester selection and Create Ticket states', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  let releaseRequesters!: () => void
  const requesterGate = new Promise<void>((resolve) => {
    releaseRequesters = resolve
  })
  await page.route('**/api/development-requesters', async (route) => {
    await requesterGate
    await route.continue()
  })
  await page.goto('/select-requester')
  await expect(page.getByRole('heading', { name: 'Loading requesters' })).toBeVisible()
  await screenshot(page, 'requester-selection/desktop-loading.png')
  releaseRequesters()
  await expect(page.getByRole('combobox', { name: /Development Requester/ }))
    .toBeVisible()
  await screenshot(page, 'requester-selection/desktop-selection.png')

  await page.unroute('**/api/development-requesters')
  await page.route('**/api/development-requesters', (route) => route.abort())
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Requesters unavailable' })).toBeVisible()
  await screenshot(page, 'requester-selection/desktop-failure.png')
  await page.unroute('**/api/development-requesters')

  const requesterA = (await requesters(request))
    .find(({ email }) => email === 'anan.wong@example.test')!
  await selectRequester(page, requesterA)
  await page.getByRole('link', { name: 'Create a new ticket' }).click()
  await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible()
  await screenshot(page, 'create-ticket/desktop-initial.png')

  await page.getByRole('button', { name: 'Create Ticket' }).click()
  await expect(page.getByText('Select a Category.')).toBeVisible()
  const category = page.getByRole('combobox', { name: /Category/ })
  await expect(category).toBeFocused()
  const skipLink = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skipLink).not.toBeFocused()
  expect(await skipLink.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return bounds.bottom <= 0
  })).toBe(true)
  await expect(skipLink).toHaveCSS('opacity', '0')
  await screenshot(page, 'create-ticket/desktop-validation.png')

  await page.getByLabel('Attachments (optional)').setInputFiles([
    pdfFile,
    {
      name: 'unsupported.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an allowed attachment'),
    },
  ])
  await expect(page.getByText('unsupported.txt', { exact: true })).toBeVisible()
  await screenshot(page, 'create-ticket/desktop-invalid-attachment.png')
  await page.getByRole('button', { name: 'Remove unsupported.txt from selection' }).click()

  await fillValidTicket(page, String(Date.now()))
  await page.route('**/api/tickets', (route) => {
    if (route.request().method() === 'POST') return route.abort()
    return route.continue()
  })
  await page.getByRole('button', { name: 'Create Ticket' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be created')
  await expect(page.getByRole('textbox', { name: /Ticket Summary/ }))
    .toHaveValue(/\[E2E\] Visual ticket/)
  await screenshot(page, 'create-ticket/desktop-api-failure.png')
  await page.unroute('**/api/tickets')

  await page.route('**/api/tickets', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
    await route.continue()
  })
  await page.getByRole('button', { name: 'Create Ticket' }).click()
  await expect(page.getByRole('button', { name: 'Creating ticket...' })).toBeVisible()
  await screenshot(page, 'create-ticket/desktop-submitting.png')
  await expect(page.getByRole('heading', { name: 'Ticket created' })).toBeVisible()
  await screenshot(page, 'create-ticket/desktop-success.png')
})

test('captures list controls, pagination, empty, no-results, and responsive cards', async ({
  page,
  request,
}) => {
  const users = await requesters(request)
  const requesterA = users.find(({ email }) => email === 'narin.suksan@example.test')!
  const emptyRequester = users.find(({ email }) => email === EMPTY_REQUESTER_EMAIL)!
  const batch = randomUUID().slice(0, 8)
  await Promise.all(
    Array.from({ length: 11 }, (_, index) =>
      createTicketFixture(
        request,
        requesterA.id,
        'visual-list-' + batch + '-' + index,
      )),
  )
  const searchPrefix = '[E2E] visual-list-' + batch + '-'

  await page.setViewportSize({ width: 1280, height: 800 })
  await restoreRequester(page, requesterA.id)
  await page.goto('/tickets')
  await page.getByLabel('Search tickets').fill(searchPrefix)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const pagination = page.getByRole('navigation', { name: 'Ticket list pages' })
  await expect(pagination.getByText('Page 1 of 2')).toBeVisible()
  await page.getByRole('button', { name: /Filters/ }).click()
  const selectAfterTicketResponse = async (
    name: string,
    option: string | { label: string },
  ) => {
    await Promise.all([
      page.waitForResponse((response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/tickets?') &&
        response.ok()),
      page.getByRole('combobox', { name, exact: true }).selectOption(option),
    ])
  }
  await selectAfterTicketResponse('Category', { label: 'Account and Access' })
  await selectAfterTicketResponse('Requested Priority', 'MEDIUM')
  await selectAfterTicketResponse('Sort by', 'ticketNumber')
  await selectAfterTicketResponse('Sort direction', 'asc')
  await page.getByLabel('Search tickets').fill(searchPrefix)
  await Promise.all([
    page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/api/tickets?') &&
      response.ok()),
    page.getByRole('button', { name: 'Search', exact: true }).click(),
  ])
  await expect(pagination.getByText('Page 1 of 2')).toBeVisible()
  await expect(page.locator('.ticket-table-wrap')).toBeVisible()
  await screenshot(page, 'my-tickets/desktop-list.png')

  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(pagination.getByText('Page 2 of 2')).toBeVisible()
  await expect(page.locator('.ticket-table tbody tr')).toHaveCount(1)

  await page.getByLabel('Search tickets').fill('NO-E2E-TICKET-WILL-MATCH')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No matching tickets' })).toBeVisible()
  await screenshot(page, 'my-tickets/no-results.png')

  await selectRequester(page, emptyRequester)
  await expect(page.getByRole('heading', { name: 'No tickets yet' })).toBeVisible()
  await screenshot(page, 'my-tickets/empty.png')

  for (const viewport of [
    { name: 'tablet-list.png', width: 834, height: 1112 },
    { name: 'mobile-list.png', width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.evaluate(
      ({ key, value }) => window.sessionStorage.setItem(key, value),
      { key: 'toktickit.devRequesterId', value: String(requesterA.id) },
    )
    await page.goto('/tickets')
    await page.getByLabel('Search tickets').fill(searchPrefix)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.locator('.ticket-card-list')).toBeVisible()
    await screenshot(page, 'my-tickets/' + viewport.name)
  }
})

test('captures owned Ticket Detail and the attachment lifecycle at all viewports', async ({
  page,
  request,
}) => {
  const requesterA = (await requesters(request))
    .find(({ email }) => email === 'pimchanok.dee@example.test')!
  const ticket = await createTicketFixture(request, requesterA.id, 'visual-detail')
  const upload = await request.post(
    `${API_URL}/api/tickets/${ticket.ticketNumber}/attachments`,
    {
      headers: { 'X-Development-Requester-Id': String(requesterA.id) },
      multipart: { file: pdfFile },
    },
  )
  expect(upload.status()).toBe(201)

  await restoreRequester(page, requesterA.id)
  for (const viewport of [
    { path: 'desktop-detail.png', width: 1280, height: 800 },
    { path: 'tablet-detail.png', width: 834, height: 1112 },
    { path: 'mobile-detail.png', width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/tickets/' + ticket.ticketNumber)
    await expect(page.getByRole('heading', { name: ticket.ticketNumber })).toBeVisible()
    await expect(page.getByText(pdfFile.name, { exact: true })).toBeVisible()
    await screenshot(page, 'ticket-detail/' + viewport.path)
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('button', { name: 'Remove ' + pdfFile.name }).click()
  await page.getByLabel('Removal reason').fill('Visual evidence soft removal')
  await page.getByRole('button', { name: 'Remove Attachment' }).click()
  await expect(page.getByText('Visual evidence soft removal')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download ' + pdfFile.name }))
    .toHaveCount(0)
  await screenshot(page, 'ticket-detail/attachment-removed.png')
})
