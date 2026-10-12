import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  E2E_ADMIN_USER,
  E2E_REQUESTER_PASSWORD,
  E2E_REQUESTER_USERS,
  E2E_STAFF_USER,
  E2E_WORKFLOW_TICKET,
} from '../lab-03/values.js'
import { database } from '../lab-02/database.js'

const actionDescription = 'Accessibility audit populated Action record'
const actionFixtureKey = 'lab4-accessibility-action'

test.beforeAll(async () => {
  const prisma = await database()
  try {
    const staff = await prisma.user.findUniqueOrThrow({ where: { fixtureKey: E2E_STAFF_USER.fixtureKey } })
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: E2E_WORKFLOW_TICKET } })
    await prisma.actionTaken.create({ data: {
      fixtureKey: actionFixtureKey,
      ticketId: ticket.id,
      ticketWorkCycle: ticket.workCycle,
      description: actionDescription,
      status: 'PLANNED',
      createdById: staff.id,
      assignedToId: staff.id,
      idempotencyKey: '71000000-0000-4000-8000-000000000062',
      requestFingerprint: 'f'.repeat(64),
    } })
  } finally {
    await prisma.$disconnect()
  }
})

test.afterAll(async () => {
  const prisma = await database()
  try {
    await prisma.actionTaken.deleteMany({ where: { fixtureKey: actionFixtureKey } })
  } finally {
    await prisma.$disconnect()
  }
})

async function login(page: Page, email: string, heading: string) {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(E2E_REQUESTER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

async function audit(page: Page, path: string, heading: string, ready: Locator) {
  await page.goto(path)
  await expect(
    page.getByRole('heading', { name: heading, exact: true }),
  ).toBeVisible()
  await expect(ready).toBeVisible()
  await expect(page.locator('.feedback-loading')).toHaveCount(0)
  await expect(page.locator('.actions-loading')).toHaveCount(0)
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
  await audit(
    page,
    '/dashboard',
    'Dashboard',
    page.getByRole('region', { name: 'Ticket summary' }),
  )
  await audit(
    page,
    '/tickets/' + E2E_WORKFLOW_TICKET,
    E2E_WORKFLOW_TICKET,
    page.getByText(actionDescription, { exact: true }),
  )
})

test('Staff Lab 4 screens pass automated accessibility checks', async ({ page }) => {
  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  await audit(
    page,
    '/staff/dashboard',
    'Operational Dashboard',
    page.getByRole('region', { name: 'Operational summary' }),
  )
  await audit(
    page,
    '/staff/tickets/' + E2E_WORKFLOW_TICKET,
    E2E_WORKFLOW_TICKET,
    page.getByText(actionDescription, { exact: true }),
  )
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible()
})

test('Administrator screens pass automated accessibility checks', async ({ page }) => {
  await login(page, E2E_ADMIN_USER.email, 'Ticket Queue')
  await audit(
    page,
    '/staff/dashboard',
    'Operational Dashboard',
    page.getByRole('heading', { name: 'Account summary' }),
  )
  await audit(
    page,
    '/admin/users',
    'User Management',
    page.getByText(E2E_ADMIN_USER.email, { exact: true }),
  )
})
