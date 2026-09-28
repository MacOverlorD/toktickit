import { expect, test, type Page } from '@playwright/test'
import {
  E2E_REQUESTER_PASSWORD,
  E2E_REQUESTER_USERS,
  E2E_STAFF_USER,
  E2E_WORKFLOW_TICKET,
} from '../lab-03/values.js'

async function login(page: Page, email: string, heading: string) {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(E2E_REQUESTER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

test('staff records and completes an Action that the Requester sees read-only', async ({ page }) => {
  const description = `E2E connectivity diagnosis ${Date.now()}`
  const result = 'Connectivity restored and verified with the requester.'
  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  await page.goto(`/staff/tickets/${E2E_WORKFLOW_TICKET}`)
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible()
  await page.getByRole('button', { name: 'Add Action Taken' }).click()
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Assigned to').selectOption({ label: 'E2E Queue Staff — IT Staff' })
  await page.getByLabel('Follow-Up Required').check()
  await page.getByLabel('Follow-up Note').fill('Confirm stability tomorrow.')
  await page.getByLabel(/Evidence notes/).fill('Diagnostic output is referenced; this is shared text only.')
  await page.getByRole('button', { name: 'Create Action' }).click()
  await expect(page.getByText('Action created.')).toBeVisible()

  const card = page.locator('.action-card').filter({ hasText: description })
  await card.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('Action started.')).toBeVisible()
  await card.getByRole('button', { name: 'Complete' }).click()
  await page.getByLabel(/^Result/).fill(result)
  await page.getByRole('button', { name: 'Complete Action' }).click()
  await expect(page.getByText('Action completed.')).toBeVisible()
  await expect(card.getByText('COMPLETED')).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await login(page, E2E_REQUESTER_USERS[0].email, 'My Tickets')
  await page.goto(`/tickets/${E2E_WORKFLOW_TICKET}`)
  await expect(page.getByText(description)).toBeVisible()
  await expect(page.getByText(result)).toBeVisible()
  await expect(page.getByText(/Shared read-only history/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Edit|Complete|Cancel Action/ })).toHaveCount(0)
})

test('Actions Taken has no horizontal page overflow at required viewports', async ({ page }) => {
  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(`/staff/tickets/${E2E_WORKFLOW_TICKET}`)
    await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})
