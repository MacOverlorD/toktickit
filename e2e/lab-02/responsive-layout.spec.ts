import { expect, test, type Page } from '@playwright/test'
import {
  assertNoPageOverflow,
  createTicketFixture,
  requesters,
  restoreRequester,
} from './helpers.js'

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const

async function assertCorePagesFit(
  page: Page,
  requesterId: number,
  ticketNumber: string,
  representation: 'table' | 'cards',
) {
  await restoreRequester(page, requesterId)

  await page.goto('/tickets/new')
  await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible()
  await assertNoPageOverflow(page)

  await page.goto('/tickets')
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible()
  await page.getByLabel('Search tickets').fill(ticketNumber)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  if (representation === 'table') {
    await expect(page.locator('.ticket-table-wrap')).toBeVisible()
    await expect(page.locator('.ticket-card-list')).toBeHidden()
    await expect(page.locator('.ticket-table-wrap').getByText(ticketNumber, { exact: true }))
      .toBeVisible()
  } else {
    await expect(page.locator('.ticket-table-wrap')).toBeHidden()
    await expect(page.locator('.ticket-card-list')).toBeVisible()
    await expect(page.locator('.ticket-card-list').getByText(ticketNumber, { exact: true }))
      .toBeVisible()
  }
  await assertNoPageOverflow(page)

  await page.goto('/tickets/' + ticketNumber)
  await expect(page.getByRole('heading', { name: ticketNumber })).toBeVisible()
  await page.getByRole('button', { name: /Add attachments/ }).setInputFiles({
    name: 'responsive.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF'),
  })
  await expect(page.getByText('Attachment uploaded.')).toBeVisible()
  await page.getByRole('button', { name: 'Remove responsive.pdf' }).click()
  await expect(page.getByRole('dialog', { name: 'Remove attachment' })).toBeVisible()
  await assertNoPageOverflow(page)
}

for (const viewport of viewports) {
  test(`${viewport.name} layout has no clipping or horizontal overflow`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport)
    const requester = (await requesters(request))
      .find(({ email }) => email === 'narin.suksan@example.test')!
    const ticket = await createTicketFixture(request, requester.id, viewport.name)

    await assertCorePagesFit(
      page,
      requester.id,
      ticket.ticketNumber,
      viewport.name === 'desktop' ? 'table' : 'cards',
    )
  })
}
