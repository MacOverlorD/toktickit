import { expect, test, type Page } from '@playwright/test'
import {
  E2E_ADMIN_USER,
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

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
}

test('Labs 1-4 critical routes retain role isolation without browser errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(message.text())
    }
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    const expectedAnonymousProbe =
      response.status() === 401 && response.url().endsWith('/api/auth/me')
    if (response.status() >= 400 && !expectedAnonymousProbe) {
      errors.push(`${response.status()} ${response.url()}`)
    }
  })

  await login(page, E2E_REQUESTER_USERS[0].email, 'My Tickets')
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await page.goto('/tickets/' + E2E_WORKFLOW_TICKET)
  await expect(page.getByRole('heading', { name: 'Attachments' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Public Comments' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible()
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'Forbidden' })).toBeVisible()
  await logout(page)

  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'Operational Dashboard', exact: true })).toBeVisible()
  await page.goto('/staff/tickets/' + E2E_WORKFLOW_TICKET)
  await expect(page.getByRole('heading', { name: 'Internal Notes' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible()
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Forbidden' })).toBeVisible()
  await logout(page)

  await login(page, E2E_ADMIN_USER.email, 'Ticket Queue')
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'Account summary' })).toBeVisible()
  expect(errors).toEqual([])
})
