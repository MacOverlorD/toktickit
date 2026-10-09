import AxeBuilder from '@axe-core/playwright'
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

async function audit(page: Page, path: string, heading: string) {
  await page.goto(path)
  await expect(
    page.getByRole('heading', { name: heading, exact: true }),
  ).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(
    (item) => item.impact === 'serious' || item.impact === 'critical',
  )
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])

  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Tab')
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement
    const style = getComputedStyle(active)
    return {
      tag: active.tagName,
      visible: active.matches(':focus-visible'),
      outlined: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
    }
  })
  expect(focus.tag).not.toBe('BODY')
  expect(focus.visible).toBe(true)
  expect(focus.outlined).toBe(true)
}

test('Requester Lab 4 screens pass automated accessibility checks', async ({ page }) => {
  await login(page, E2E_REQUESTER_USERS[0].email, 'My Tickets')
  await audit(page, '/dashboard', 'Dashboard')
  await audit(page, '/tickets/' + E2E_WORKFLOW_TICKET, E2E_WORKFLOW_TICKET)
})

test('Staff Lab 4 screens pass automated accessibility checks', async ({ page }) => {
  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  await audit(page, '/staff/dashboard', 'Operational Dashboard')
  await audit(page, '/staff/tickets/' + E2E_WORKFLOW_TICKET, E2E_WORKFLOW_TICKET)
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible()
})

test('Administrator screens pass automated accessibility checks', async ({ page }) => {
  await login(page, E2E_ADMIN_USER.email, 'Ticket Queue')
  await audit(page, '/staff/dashboard', 'Operational Dashboard')
  await audit(page, '/admin/users', 'User Management')
})
