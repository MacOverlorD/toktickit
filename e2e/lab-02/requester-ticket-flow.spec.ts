import { expect, test } from '@playwright/test'
import {
  API_URL,
  pdfFile,
  requesters,
  selectRequester,
} from './helpers.js'

test('requester owns the complete ticket and attachment lifecycle', async ({
  page,
  request,
}) => {
  const users = await requesters(request)
  const requesterA = users.find(({ email }) => email === 'anan.wong@example.test')!
  const requesterB = users.find(({ email }) => email === 'mali.chaiyasit@example.test')!

  await selectRequester(page, requesterA)
  await expect(page.getByText(requesterA.name, { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Create a new ticket' }).click()
  await expect(page.getByRole('textbox', { name: /Requester Read-only/ })).toHaveValue(
    `${requesterA.name} (${requesterA.email})`,
  )

  await page.getByRole('button', { name: 'Create Ticket' }).click()
  await expect(page.getByText('Select a Category.')).toBeVisible()
  await expect(page.getByText('Ticket Summary must be 5-120 characters after trimming.'))
    .toBeVisible()

  await page.getByRole('combobox', { name: /Category/ }).selectOption({ label: 'Hardware' })
  await page.getByRole('combobox', { name: /Related System/ })
    .selectOption({ label: 'Corporate Laptop' })
  await page.getByRole('textbox', { name: /Ticket Summary/ }).fill(
    '[E2E] Laptop battery evidence ' + Date.now(),
  )
  await page.getByRole('combobox', { name: /Requested Priority/ })
    .selectOption('HIGH')
  await page.getByRole('textbox', { name: /Description/ }).fill(
    '[E2E] Battery drains rapidly during normal requester work.',
  )
  await page.getByLabel('Attachments (optional)').setInputFiles(pdfFile)

  const createResponse = page.waitForResponse((response) =>
    response.url() === API_URL + '/api/tickets' &&
    response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create Ticket' }).click()
  expect((await createResponse).status()).toBe(201)
  await expect(page.getByRole('heading', { name: 'Ticket created' })).toBeVisible()
  await expect(page.getByText('1 of 1 uploaded.')).toBeVisible()
  const ticketHeading = page.getByRole('heading', { name: /^TKT-\d{8}-[A-F0-9]{8}$/ })
  const ticketNumber = (await ticketHeading.textContent())!

  await page.getByRole('link', { name: 'Go to My Tickets' }).click()
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible()
  await page.getByLabel('Search tickets').fill(ticketNumber)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const matchingRow = page.getByRole('row').filter({ hasText: ticketNumber })
  await expect(matchingRow).toHaveCount(1)
  await matchingRow.getByRole('link', { name: ticketNumber, exact: true }).click()
  await expect(page.getByRole('heading', { name: ticketNumber })).toBeVisible()
  await expect(page.getByText(pdfFile.name, { exact: true })).toBeVisible()

  const attachmentResponse = await request.get(
    `${API_URL}/api/tickets/${ticketNumber}/attachments`,
    { headers: { 'X-Development-Requester-Id': String(requesterA.id) } },
  )
  expect(attachmentResponse.status()).toBe(200)
  const [attachment] = await attachmentResponse.json() as Array<{ id: number }>

  const deniedContent = await request.get(
    `${API_URL}/api/tickets/${ticketNumber}/attachments/${attachment.id}/content`,
    { headers: { 'X-Development-Requester-Id': String(requesterB.id) } },
  )
  expect(deniedContent.status()).toBe(404)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download ' + pdfFile.name }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(pdfFile.name)

  await page.getByRole('button', { name: 'Remove ' + pdfFile.name }).click()
  const dialog = page.getByRole('dialog', { name: 'Remove attachment' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Removal reason').fill('Evidence replaced by requester')
  await dialog.getByRole('button', { name: 'Remove Attachment' }).click()
  await expect(page.getByText('Attachment removed.')).toBeVisible()
  await expect(page.getByText('Evidence replaced by requester')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download ' + pdfFile.name }))
    .toHaveCount(0)

  const removedContent = await request.get(
    `${API_URL}/api/tickets/${ticketNumber}/attachments/${attachment.id}/content`,
    { headers: { 'X-Development-Requester-Id': String(requesterA.id) } },
  )
  expect(removedContent.status()).toBe(410)

  await page.getByRole('link', { name: /Change Development Requester/ }).click()
  await page.getByRole('combobox', { name: /Development Requester/ })
    .selectOption(String(requesterB.id))
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible()
  await page.getByLabel('Search tickets').fill(ticketNumber)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No matching tickets' })).toBeVisible()

  await page.goto('/tickets/' + ticketNumber)
  await expect(page.getByRole('heading', { name: 'Ticket not found' })).toBeVisible()
})
